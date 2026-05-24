import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';
import { tagRepo } from '@/lib/db/repositories/tag.repo';
import { actionItemRepo } from '@/lib/db/repositories/action-item.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { exportToMarkdown, exportToHtml } from '@/lib/utils/export';
import { buildAiSummaryMarkdown } from '@/lib/utils/aiExportTemplate';
import { buildRetroCsv } from '@/lib/utils/csvExport';
import { requireTeamId } from '@/lib/utils/teamAuth';
import { resolveVoteDenominator } from '@/lib/utils/voteDenominator';

/**
 * Strip characters that could break out of the `filename=""` parameter
 * in a Content-Disposition header (CRLF for header injection, quotes
 * for filename escape, NUL/control chars, path separators). Cap length
 * so a deliberately-long name can't blow up download UI.
 */
function safeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/["\\\r\n/\\\\\x00-\x1f]/g, '_').slice(0, 100) || 'retro';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  const { roomId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'md';

  const room = roomRepo.findById(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  if (room.teamId !== null && room.teamId !== gate.teamId) {
    return NextResponse.json({ error: 'Room belongs to a different team' }, { status: 403 });
  }

  const cards = cardRepo.findByRoomId(roomId);
  const tags = tagRepo.findByRoomId(roomId);
  const actionItems = actionItemRepo.findByRoomId(roomId);
  const participants = participantRepo.findByRoomId(roomId);

  // Build cards with tags and author info for export. Reveal-name
  // resolution mirrors src/lib/socket/dto.ts: prefer the author's chosen
  // reveal name; only fall back to the default participant nickname
  // (`Guest-XXXX`) when they revealed without supplying one. Without
  // this fallback order the export attributes every revealed card to
  // "Guest-XXXX" even when the author typed a real name.
  const cardsWithMeta = cards.map(card => {
    const cardTags = cardRepo.getTagsForCard(card.id);
    let authorNickname: string | null = null;
    if (room.isAnonymous) {
      // Anonymous export: author name suppressed regardless of reveal.
      authorNickname = null;
    } else {
      // Named room: always attribute (chosen reveal name → falls back
      // to the author's current nickname). Mirrors toCardDTO so the
      // socket payload and the exported file match.
      authorNickname =
        card.revealedNickname ??
        participantRepo.findById(card.authorId)?.nickname ??
        null;
    }
    return { ...card, tags: cardTags, authorNickname };
  });

  // For anonymous / configured rooms the live session count over-reports
  // (one row per browser tab, plus Guest-XXX rejoins). Use the
  // facilitator-configured headcount when available.
  const denom = resolveVoteDenominator(room, participants.length);

  if (format === 'html') {
    const html = exportToHtml(room, cardsWithMeta, tags, actionItems, denom);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename(room.name)}-retro.html"`,
      },
    });
  }

  if (format === 'ai') {
    const aiMd = buildAiSummaryMarkdown(room, cardsWithMeta, tags, actionItems, denom);
    return new Response(aiMd, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename(room.name)}-retro-ai-summary.md"`,
      },
    });
  }

  if (format === 'csv') {
    const csv = buildRetroCsv(room, cardsWithMeta, actionItems);
    // BOM so Excel auto-detects UTF-8 (avoids mojibake on Windows / 中文 cells).
    const body = '﻿' + csv;
    return new Response(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename(room.name)}-retro.csv"`,
      },
    });
  }

  const md = exportToMarkdown(room, cardsWithMeta, tags, actionItems, denom);
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename(room.name)}-retro.md"`,
    },
  });
}
