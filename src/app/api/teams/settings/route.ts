import { NextResponse } from 'next/server';
import { requireTeamId } from '@/lib/utils/teamAuth';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { teamSectionRepo } from '@/lib/db/repositories/team-section.repo';
import {
  MAX_SECTION_LABEL_CHARS,
  MAX_SECTION_EMOJI_CHARS,
  isValidSectionTone,
} from '@/lib/socket/handlers/limits';

// A summary prompt is a multi-line instruction block; keep it bounded so a
// single team row can't grow without limit (it's echoed into every export).
const MAX_SUMMARY_PROMPT_CHARS = 8_000;
// A reaction emoji is one short glyph string; cap each entry and the count so
// the palette stays a palette.
const MAX_REACTION_EMOJI_CHARS = 16;
const MAX_REACTION_EMOJIS = 40;

/**
 * GET — the team's customisation settings for the team-settings editor.
 * Shape: { summaryPrompt, reactionEmojis, sections }.
 *
 * If the team has no team_sections yet, seed them from the 'classic'
 * template so the section editor opens with editable rows instead of a blank
 * list.
 */
export async function GET(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  try {
    const settings = teamRepo.getSettings(gate.teamId);
    // Seed defaults on first open so the editor always has rows to show.
    const sections = teamSectionRepo.seedFromTemplate(gate.teamId, 'classic');
    return NextResponse.json({
      summaryPrompt: settings?.summaryPrompt ?? null,
      reactionEmojis: settings?.reactionEmojis ?? null,
      sections,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load team settings' }, { status: 500 });
  }
}

/**
 * PUT — patch the team's settings. Body (all keys optional):
 *   { summaryPrompt?: string|null, reactionEmojis?: string[]|null,
 *     sections?: Array<{sectionKey?, label, emoji, tone, position}> }
 *
 * summaryPrompt / reactionEmojis update teams.*; passing null clears to the
 * default. When `sections` is present it REPLACES the team's team_sections
 * transactionally (ordered by the array, generating keys for new rows).
 * Returns the updated settings in the same shape as GET.
 */
export async function PUT(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  try {
    const body = await request.json().catch(() => ({}));

    // ── summaryPrompt ──
    const settingsPatch: { summaryPrompt?: string | null; reactionEmojis?: string[] | null } = {};
    if ('summaryPrompt' in body) {
      const sp = body.summaryPrompt;
      if (sp === null) {
        settingsPatch.summaryPrompt = null;
      } else if (typeof sp === 'string') {
        if (sp.length > MAX_SUMMARY_PROMPT_CHARS) {
          return NextResponse.json(
            { error: `summaryPrompt too long (max ${MAX_SUMMARY_PROMPT_CHARS} chars)` },
            { status: 400 },
          );
        }
        // An all-whitespace prompt is treated as "use default" (null).
        settingsPatch.summaryPrompt = sp.trim().length > 0 ? sp : null;
      } else {
        return NextResponse.json({ error: 'summaryPrompt must be a string or null' }, { status: 400 });
      }
    }

    // ── reactionEmojis ──
    if ('reactionEmojis' in body) {
      const re = body.reactionEmojis;
      if (re === null) {
        settingsPatch.reactionEmojis = null;
      } else if (Array.isArray(re)) {
        if (re.length > MAX_REACTION_EMOJIS) {
          return NextResponse.json(
            { error: `Too many reaction emojis (max ${MAX_REACTION_EMOJIS})` },
            { status: 400 },
          );
        }
        const cleaned = re
          .filter((e: unknown): e is string => typeof e === 'string')
          .map((e) => e.trim())
          .filter((e) => e.length > 0 && e.length <= MAX_REACTION_EMOJI_CHARS);
        // Empty after cleaning → fall back to defaults (null).
        settingsPatch.reactionEmojis = cleaned.length > 0 ? cleaned : null;
      } else {
        return NextResponse.json({ error: 'reactionEmojis must be an array or null' }, { status: 400 });
      }
    }

    // ── sections (full replace) ──
    if ('sections' in body) {
      const sections = body.sections;
      if (!Array.isArray(sections)) {
        return NextResponse.json({ error: 'sections must be an array' }, { status: 400 });
      }
      const rows: Array<{ sectionKey?: string; label: string; emoji: string; tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber' }> = [];
      for (const s of sections) {
        const label = typeof s?.label === 'string' ? s.label.trim() : '';
        if (!label) {
          return NextResponse.json({ error: 'Each section needs a non-empty label' }, { status: 400 });
        }
        if (label.length > MAX_SECTION_LABEL_CHARS) {
          return NextResponse.json(
            { error: `Section label too long (max ${MAX_SECTION_LABEL_CHARS} chars)` },
            { status: 400 },
          );
        }
        if (!isValidSectionTone(s?.tone)) {
          return NextResponse.json({ error: 'Invalid section tone' }, { status: 400 });
        }
        const emoji = (typeof s?.emoji === 'string' ? s.emoji.trim() : '').slice(0, MAX_SECTION_EMOJI_CHARS) || '🗒️';
        rows.push({
          sectionKey: typeof s?.sectionKey === 'string' ? s.sectionKey : undefined,
          label,
          emoji,
          tone: s.tone,
        });
      }
      teamSectionRepo.replaceAll(gate.teamId, rows);
    }

    if (settingsPatch.summaryPrompt !== undefined || settingsPatch.reactionEmojis !== undefined) {
      teamRepo.updateSettings(gate.teamId, settingsPatch);
    }

    const updated = teamRepo.getSettings(gate.teamId);
    const updatedSections = teamSectionRepo.findByTeamId(gate.teamId);
    return NextResponse.json({
      summaryPrompt: updated?.summaryPrompt ?? null,
      reactionEmojis: updated?.reactionEmojis ?? null,
      sections: updatedSections,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update team settings' }, { status: 500 });
  }
}
