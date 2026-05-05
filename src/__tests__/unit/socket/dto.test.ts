import type { CardDB, Tag, Participant } from '@/lib/types';

// ---- mocks must be declared before importing the module under test ----
const mockGetTagsForCard = jest.fn<Tag[], [string]>();
const mockFindById = jest.fn<Participant | null, [string]>();

jest.mock('@/lib/db/repositories/card.repo', () => ({
  cardRepo: { getTagsForCard: mockGetTagsForCard },
}));

jest.mock('@/lib/db/repositories/participant.repo', () => ({
  participantRepo: { findById: mockFindById },
}));

import { toCardDTO } from '@/lib/socket/dto';

// -----------------------------------------------------------------------

function makeCard(overrides: Partial<CardDB> = {}): CardDB {
  return {
    id: 'card-abc',
    roomId: 'room-1',
    section: 'went-well',
    content: 'Nice sprint',
    authorId: 'author-id',
    isRevealed: false,
    revealedNickname: null,
    createdAt: '2025-01-01T00:00:00',
    updatedAt: '2025-01-01T00:00:00',
    ...overrides,
  };
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'author-id',
    roomId: 'room-1',
    nickname: 'Alice',
    isScrumMaster: false,
    sessionToken: 'token-abc',
    joinedAt: '2025-01-01T00:00:00',
    isOnline: true,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetTagsForCard.mockReturnValue([]);
  mockFindById.mockReturnValue(null);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('toCardDTO', () => {
  describe('basic shape', () => {
    it('returns a DTO with the correct base fields', () => {
      const card = makeCard();
      const dto = toCardDTO(card, 'viewer-id');

      expect(dto.id).toBe('card-abc');
      expect(dto.roomId).toBe('room-1');
      expect(dto.section).toBe('went-well');
      expect(dto.content).toBe('Nice sprint');
      expect(dto.createdAt).toBe('2025-01-01T00:00:00');
    });
  });

  describe('isOwnCard', () => {
    it('is true when viewerParticipantId matches authorId', () => {
      const card = makeCard({ authorId: 'player-1' });
      const dto = toCardDTO(card, 'player-1');
      expect(dto.isOwnCard).toBe(true);
    });

    it('is false when viewerParticipantId does NOT match authorId', () => {
      const card = makeCard({ authorId: 'player-1' });
      const dto = toCardDTO(card, 'player-2');
      expect(dto.isOwnCard).toBe(false);
    });
  });

  describe('authorNickname', () => {
    it('is null when card is NOT revealed', () => {
      const card = makeCard({ isRevealed: false, authorId: 'author-id' });
      mockFindById.mockReturnValue(makeParticipant());

      const dto = toCardDTO(card, 'viewer-id');

      expect(dto.authorNickname).toBeNull();
      // participantRepo should NOT be called for unrevealed cards
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('is set to the author nickname when card IS revealed', () => {
      const card = makeCard({ isRevealed: true, authorId: 'author-id' });
      mockFindById.mockReturnValue(makeParticipant({ id: 'author-id', nickname: 'Alice' }));

      const dto = toCardDTO(card, 'viewer-id');

      expect(dto.authorNickname).toBe('Alice');
      expect(mockFindById).toHaveBeenCalledWith('author-id');
    });

    it('is null when card is revealed but author participant not found', () => {
      const card = makeCard({ isRevealed: true, authorId: 'deleted-author' });
      mockFindById.mockReturnValue(null);

      const dto = toCardDTO(card, 'viewer-id');

      expect(dto.authorNickname).toBeNull();
    });
  });

  describe('tags', () => {
    it('includes tags returned by cardRepo.getTagsForCard', () => {
      const tags: Tag[] = [
        { id: 't1', roomId: 'room-1', name: 'Bug', color: '#ef4444', isDefault: false },
        { id: 't2', roomId: 'room-1', name: 'Process', color: '#3b82f6', isDefault: false },
      ];
      mockGetTagsForCard.mockReturnValue(tags);

      const card = makeCard();
      const dto = toCardDTO(card, 'viewer-id');

      expect(dto.tags).toHaveLength(2);
      expect(dto.tags[0].name).toBe('Bug');
      expect(dto.tags[1].name).toBe('Process');
      expect(mockGetTagsForCard).toHaveBeenCalledWith('card-abc');
    });

    it('returns empty tags array when card has no tags', () => {
      mockGetTagsForCard.mockReturnValue([]);
      const dto = toCardDTO(makeCard(), 'viewer-id');
      expect(dto.tags).toHaveLength(0);
    });
  });

  describe('combined scenarios', () => {
    it('own revealed card has isOwnCard=true and authorNickname set', () => {
      const card = makeCard({ authorId: 'me', isRevealed: true });
      mockFindById.mockReturnValue(makeParticipant({ id: 'me', nickname: 'Myself' }));

      const dto = toCardDTO(card, 'me');

      expect(dto.isOwnCard).toBe(true);
      expect(dto.authorNickname).toBe('Myself');
      expect(dto.isRevealed).toBe(true);
    });

    it('other person unrevealed card: isOwnCard=false, authorNickname=null', () => {
      const card = makeCard({ authorId: 'someone-else', isRevealed: false });
      const dto = toCardDTO(card, 'me');

      expect(dto.isOwnCard).toBe(false);
      expect(dto.authorNickname).toBeNull();
    });
  });
});
