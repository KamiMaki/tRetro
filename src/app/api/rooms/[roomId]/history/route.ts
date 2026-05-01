import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';
import { tagRepo } from '@/lib/db/repositories/tag.repo';
import { actionItemRepo } from '@/lib/db/repositories/action-item.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { commentRepo } from '@/lib/db/repositories/comment.repo';
import { reactionRepo } from '@/lib/db/repositories/reaction.repo';
import { voteRepo } from '@/lib/db/repositories/vote.repo';
import { drawingRepo } from '@/lib/db/repositories/drawing.repo';
import { metricRepo } from '@/lib/db/repositories/metric.repo';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const room = roomRepo.findById(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const cards = cardRepo.findByRoomId(roomId);
  const tags = tagRepo.findByRoomId(roomId);
  const actionItems = actionItemRepo.findByRoomId(roomId);
  const participants = participantRepo.findByRoomId(roomId);

  // Build enriched cards with all v2 data
  const enrichedCards = cards.map((card) => {
    const cardTags = cardRepo.getTagsForCard(card.id);
    let authorNickname: string | null = null;
    if (card.isRevealed) {
      const author = participantRepo.findById(card.authorId);
      authorNickname = author?.nickname ?? null;
    }

    const comments = commentRepo.findByCardId(card.id);
    const reactionSummaries = reactionRepo.getByCardId(card.id);
    const reactions = reactionSummaries.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      hasReacted: false, // read-only history, no current user context
    }));
    const voteCount = voteRepo.getCountByCardId(card.id);
    const drawings = drawingRepo.findByCardId(card.id);

    return {
      id: card.id,
      roomId: card.roomId,
      section: card.section,
      content: card.content,
      isOwnCard: false, // read-only history
      isRevealed: card.isRevealed,
      authorNickname,
      tags: cardTags,
      createdAt: card.createdAt,
      comments,
      reactions,
      voteCount,
      hasVoted: false,
      drawings,
    };
  });

  const metricsAggregate = metricRepo.getAggregateByRoomId(roomId);

  return NextResponse.json({
    room,
    cards: enrichedCards,
    tags,
    actionItems,
    participantCount: participants.length,
    metricsAggregate,
  });
}
