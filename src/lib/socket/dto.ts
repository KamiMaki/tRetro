import type { CardDB, CardDTO, CardDTOv2, Comment, Tag } from '../types';
import { cardRepo } from '../db/repositories/card.repo';
import { participantRepo } from '../db/repositories/participant.repo';
import { commentRepo } from '../db/repositories/comment.repo';
import { reactionRepo } from '../db/repositories/reaction.repo';
import { voteRepo } from '../db/repositories/vote.repo';
import { drawingRepo } from '../db/repositories/drawing.repo';

/**
 * Strip identity from a comment when the room is anonymous. Named rooms
 * always carry the author nickname (matches the always-show-author
 * pattern introduced for cards in 9d8ab12). The repo layer already
 * populates authorNickname with the participant's current nickname (or
 * null if the participant was deleted), so all we do here is force null
 * for anonymous rooms.
 */
export function toCommentDTO(comment: Comment, isAnonymousRoom: boolean): Comment {
  if (isAnonymousRoom) {
    return { ...comment, authorNickname: null };
  }
  return comment;
}

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
  // Comments inherit the room's identity policy: anonymous rooms strip
  // the author nickname (defence-in-depth); named rooms carry it
  // automatically (matches always-show-author for cards).
  const comments = commentRepo
    .findByCardId(card.id)
    .map((c) => toCommentDTO(c, isAnonymousRoom));
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
