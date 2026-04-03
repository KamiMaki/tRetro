import type { CardDB, CardDTO, Tag } from '../types';
import { cardRepo } from '../db/repositories/card.repo';
import { participantRepo } from '../db/repositories/participant.repo';

export function toCardDTO(card: CardDB, viewerParticipantId: string): CardDTO {
  const tags: Tag[] = cardRepo.getTagsForCard(card.id);
  let authorNickname: string | null = null;

  if (card.isRevealed) {
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
