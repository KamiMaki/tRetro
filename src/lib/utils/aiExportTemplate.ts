import type { Room, CardDB, Tag, ActionItem } from '../types';
import { SECTION_LABELS, SECTIONS } from '../types';
import type { SectionType } from '../types';

interface CardWithMeta extends CardDB {
  tags: Tag[];
  authorNickname: string | null;
}

const PROMPT_HEADER = `You are an experienced agile coach reviewing a retrospective record.
The data below is from an anonymous team retro. Each card was contributed by a
team member; identities are intentionally hidden.

Your tasks (please do all three):

1. **Themes** — Cluster the cards into 3–6 named themes per section. Give each
   theme a short title, one sentence summary, the most important cards that
   support it, and a sentiment label (positive / neutral / negative).
2. **Top signals** — Surface the strongest signals: cards or themes with high
   votes, high comment volume, or strong consensus. Quote vote counts where
   useful.
3. **Action item suggestions** — Propose 3–7 concrete, owner-friendly action
   items the team should consider for the next sprint, drawn from the themes.
   Mark which existing action items in the retro already cover each suggestion.

Output format (Markdown):

\`\`\`markdown
## Themes

### {Section name}
- **{Theme title}** ({sentiment}): {summary}
  - Supporting cards: …
  - Suggested follow-up: …

(repeat per section)

## Top signals
- ...

## Suggested action items
- [ ] {action} — {why this matters} {(covered by existing action: yes/no)}

## Open questions
- ... (anything you noticed that the team didn't address)
\`\`\`

Be concrete and specific to the cards below. If you don't see enough signal
for a section, say so honestly rather than padding.

— retrospective data follows below the line —

---
`;

/**
 * Build a Markdown payload designed to be pasted into an external AI
 * (ChatGPT / Claude / Gemini) for theme synthesis. The top half is the
 * prompt + output schema; the bottom is the retro content.
 *
 * Privacy: Author identities are only included for cards that have been
 * explicitly revealed. Anonymous cards stay anonymous.
 */
export function buildAiSummaryMarkdown(
  room: Room,
  cards: CardWithMeta[],
  tags: Tag[],
  actionItems: ActionItem[],
  participantCount: number,
): string {
  const lines: string[] = [];
  lines.push(PROMPT_HEADER);

  lines.push(`# Retrospective: ${room.name}`);
  lines.push('');
  lines.push(`- Status: ${room.status}`);
  lines.push(`- Participants (anonymous, count only): ${participantCount}`);
  lines.push(`- Total cards: ${cards.length}`);
  lines.push(`- Total tags: ${tags.length}`);
  lines.push(`- Total action items: ${actionItems.length}`);
  lines.push(`- Exported at: ${new Date().toISOString()}`);
  lines.push('');

  for (const section of SECTIONS) {
    const sectionCards = cards.filter((c) => c.section === section);
    lines.push(`## ${SECTION_LABELS[section]} (${sectionCards.length})`);
    lines.push('');
    if (sectionCards.length === 0) {
      lines.push('_(no cards in this section)_');
    } else {
      for (const card of sectionCards) {
        const tagStr = card.tags.length > 0 ? ` [${card.tags.map((t) => `#${t.name}`).join(' ')}]` : '';
        const author = card.isRevealed && card.authorNickname ? ` _(revealed: ${card.authorNickname})_` : '';
        lines.push(`- ${card.content}${tagStr}${author}`);
      }
    }
    lines.push('');
  }

  // Tag distribution
  if (tags.length > 0) {
    lines.push('## Tag distribution');
    lines.push('');
    lines.push('| Tag | Card count | Sections seen in |');
    lines.push('|-----|-----------|------------------|');
    for (const tag of tags) {
      const tagCards = cards.filter((c) => c.tags.some((t) => t.id === tag.id));
      const sections = [...new Set(tagCards.map((c) => SECTION_LABELS[c.section as SectionType]))];
      lines.push(`| ${tag.name} | ${tagCards.length} | ${sections.join(', ') || '—'} |`);
    }
    lines.push('');
  }

  // Existing action items so the AI can avoid duplicates
  lines.push('## Existing action items already captured');
  lines.push('');
  if (actionItems.length === 0) {
    lines.push('_(none yet — the AI is free to propose new ones)_');
  } else {
    for (const item of actionItems) {
      const check = item.isCompleted ? 'x' : ' ';
      const assignee = item.assignee ? ` — owner: ${item.assignee}` : '';
      const due = item.dueDate ? ` — due ${item.dueDate}` : '';
      lines.push(`- [${check}] ${item.description}${assignee}${due}`);
    }
  }
  lines.push('');

  lines.push('— end of retro data —');
  lines.push('');
  lines.push(
    'Now produce the Themes / Top signals / Suggested action items / Open questions sections in the format described above.',
  );

  return lines.join('\n');
}
