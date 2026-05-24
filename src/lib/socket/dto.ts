import type { CardDB, CardDTO, CardDTOv2, Tag } from '../types';
import { cardRepo } from '../db/repositories/card.repo';
import { participantRepo } from '../db/repositories/participant.repo';
import { commentRepo } from '../db/repositories/comment.repo';
import { reactionRepo } from '../db/repositories/reaction.repo';
import { voteRepo } from '../db/repositories/vote.repo';
import { drawingRepo } from '../db/repositories/drawing.repo';

export function toCardDTO(
  card: CardDB,
  viewerParticipantId: string,
  isAnonymousRoom: boolean = false,
): CardDTO {
  const tags: Tag[] = cardRepo.getTagsForCard(card.id);
  let authorNickname: string | null = null;

  if (isAnonymousRoom) {
    // Anonymous rooms: author name is always null — even revealed
    // cards and the author's chosen reveal name are suppressed.
    authorNickname = null;
  } else if (card.revealedNickname) {
    // Author chose a custom reveal name. Honour it.
    authorNickname = card.revealedNickname;
  } else {
    // Named room default: resolve to the author's current nickname.
    // This bypasses the legacy `card.isRevealed` toggle — in named
    // rooms every card is attributed automatically; identity is the
    // point of named mode.
    const author = participantRepo.findById(card.authorId);
    authorNickname = author?.nickname ?? null;
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

export function toCardDTOv2(
  card: CardDB,
  viewerParticipantId: string,
  isAnonymousRoom: boolean = false,
): CardDTOv2 {
  const base = toCardDTO(card, viewerParticipantId, isAnonymousRoom);
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
