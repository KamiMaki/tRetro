import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';
import { tagRepo } from '@/lib/db/repositories/tag.repo';
import { actionItemRepo } from '@/lib/db/repositories/action-item.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { exportToMarkdown, exportToHtml } from '@/lib/utils/export';
import { buildAiSummaryMarkdown } from '@/lib/utils/aiExportTemplate';
import { buildRetroCsv } from '@/lib/utils/csvExport';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'md';

  const room = roomRepo.findById(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const cards = cardRepo.findByRoomId(roomId);
  const tags = tagRepo.findByRoomId(roomId);
  const actionItems = actionItemRepo.findByRoomId(roomId);
  const participants = participantRepo.findByRoomId(roomId);

  // Build cards with tags and author info for export
  const cardsWithMeta = cards.map(card => {
    const cardTags = cardRepo.getTagsForCard(card.id);
    let authorNickname: string | null = null;
    if (card.isRevealed) {
      const author = participantRepo.findById(card.authorId);
      authorNickname = author?.nickname ?? null;
    }
    return { ...card, tags: cardTags, authorNickname };
  });

  if (format === 'html') {
    const html = exportToHtml(room, cardsWithMeta, tags, actionItems, participants.length);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${room.name}-retro.html"`,
      },
    });
  }

  if (format === 'ai') {
    const aiMd = buildAiSummaryMarkdown(room, cardsWithMeta, tags, actionItems, participants.length);
    return new Response(aiMd, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${room.name}-retro-ai-summary.md"`,
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
        'Content-Disposition': `attachment; filename="${room.name}-retro.csv"`,
      },
    });
  }

  const md = exportToMarkdown(room, cardsWithMeta, tags, actionItems, participants.length);
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${room.name}-retro.md"`,
    },
  });
}
