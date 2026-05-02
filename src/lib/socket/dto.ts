import type { CardDB, CardDTO, CardDTOv2, Tag } from '../types';
import { cardRepo } from '../db/repositories/card.repo';
import { participantRepo } from '../db/repositories/participant.repo';
import { commentRepo } from '../db/repositories/comment.repo';
import { reactionRepo } from '../db/repositories/reaction.repo';
import { voteRepo } from '../db/repositories/vote.repo';
import { drawingRepo } from '../db/repositories/drawing.repo';

export function toCardDTO(card: CardDB, viewerParticipantId: string): CardDTO {
  const tags: Tag[] = cardRepo.getTagsForCard(card.id);
  let authorNickname: string | null = null;

  if (card.isRevealed) {
    if (card.revealedNickname) {
      // Author chose a custom name at reveal time.
      authorNickname = card.revealedNickname;
    } else {
      const author = participantRepo.findById(card.authorId);
      authorNickname = author?.nickname ?? null;
    }
  }

  return {
    id: card.id,
    roomId: card.roomId,
    section: card.section,
    content: card.content,
    isOwnCard: card.authorId === viewerParticipantId,
    isRevealed: card.isRevealed,
    authorNickname,
    tags,
    createdAt: card.createdAt,
  };
}

export function toCardDTOv2(card: CardDB, viewerParticipantId: string): CardDTOv2 {
  const base = toCardDTO(card, viewerParticipantId);
  const comments = commentRepo.findByCardId(card.id);
  const reactionSummaries = reactionRepo.getByCardId(card.id);
  const voteCount = voteRepo.getCountByCardId(card.id);
  const hasVoted = voteRepo.hasVoted(card.id, viewerParticipantId);
  const drawings = drawingRepo.findByCardId(card.id);

  return {
    ...base,
    comments,
    reactions: reactionSummaries.map(r => ({
      emoji: r.emoji,
      count: r.count,
      hasReacted: r.participantIds.includes(viewerParticipantId),
    })),
    voteCount,
    hasVoted,
    drawings,
  };
}
