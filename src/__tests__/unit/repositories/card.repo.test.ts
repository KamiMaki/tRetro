import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';

let testDb: Database.Database;

jest.mock('@/lib/db/connection', () => ({
  getDb: () => testDb,
}));

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(CREATE_TABLES_SQL);
});

afterEach(() => {
  testDb.close();
});

import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { tagRepo } from '@/lib/db/repositories/tag.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';

describe('cardRepo', () => {
  let roomId: string;
  let authorId: string;
  let tagId: string;

  beforeEach(() => {
    const room = roomRepo.create('Card Test Room');
    roomId = room.id;
    const participant = participantRepo.create(roomId, 'Tester');
    authorId = participant.id;
    const tag = tagRepo.create(roomId, 'Bug', '#ef4444');
    tagId = tag.id;
  });

  describe('create', () => {
    it('returns a card with correct fields', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Great teamwork', authorId, []);

      expect(card.id).toBeDefined();
      expect(card.roomId).toBe(roomId);
      expect(card.section).toBe('went-well');
      expect(card.content).toBe('Great teamwork');
      expect(card.authorId).toBe(authorId);
      expect(card.isRevealed).toBe(false);
      expect(card.createdAt).toBeDefined();
      expect(card.updatedAt).toBeDefined();
    });

    it('creates card with tags and populates card_tags junction', () => {
      const card = cardRepo.create(roomId, 'to-improve', 'Need better CI', authorId, [tagId]);

      expect(card.id).toBeDefined();
      const tags = cardRepo.getTagsForCard(card.id);
      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe(tagId);
    });

    it('creates card with no tags returns empty tag list', () => {
      const card = cardRepo.create(roomId, 'thanks', 'Thanks everyone', authorId, []);
      const tags = cardRepo.getTagsForCard(card.id);
      expect(tags).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('returns the card when it exists', () => {
      const created = cardRepo.create(roomId, 'deep-dive', 'Why did it fail?', authorId, []);
      const found = cardRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.content).toBe('Why did it fail?');
    });

    it('returns null when card does not exist', () => {
      const found = cardRepo.findById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByRoomId', () => {
    it('returns all cards for a room', () => {
      cardRepo.create(roomId, 'went-well', 'Card 1', authorId, []);
      cardRepo.create(roomId, 'to-improve', 'Card 2', authorId, []);

      const all = cardRepo.findByRoomId(roomId);
      expect(all).toHaveLength(2);
    });

    it('returns empty array when room has no cards', () => {
      const emptyRoom = roomRepo.create('Empty');
      const all = cardRepo.findByRoomId(emptyRoom.id);
      expect(all).toHaveLength(0);
    });
  });

  describe('getTagsForCard', () => {
    it('returns associated tags for a card', () => {
      const tag2 = tagRepo.create(roomId, 'Process', '#3b82f6');
      const card = cardRepo.create(roomId, 'to-improve', 'Slow deploys', authorId, [tagId, tag2.id]);

      const tags = cardRepo.getTagsForCard(card.id);
      expect(tags).toHaveLength(2);
      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('Bug');
      expect(tagNames).toContain('Process');
    });

    it('returns empty array for card with no tags', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Simple card', authorId, []);
      const tags = cardRepo.getTagsForCard(card.id);
      expect(tags).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates card content', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Old content', authorId, []);
      const updated = cardRepo.update(card.id, { content: 'New content' });

      expect(updated).not.toBeNull();
      expect(updated!.content).toBe('New content');
    });

    it('replaces old tags with new tags', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Tagged card', authorId, [tagId]);
      const tag2 = tagRepo.create(roomId, 'Feature', '#22c55e');

      cardRepo.update(card.id, { tagIds: [tag2.id] });
      const tags = cardRepo.getTagsForCard(card.id);

      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe(tag2.id);
    });

    it('clears all tags when updated with empty tagIds', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Tagged card', authorId, [tagId]);
      cardRepo.update(card.id, { tagIds: [] });

      const tags = cardRepo.getTagsForCard(card.id);
      expect(tags).toHaveLength(0);
    });
  });

  describe('reveal', () => {
    it('sets isRevealed to true', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Hidden card', authorId, []);
      expect(card.isRevealed).toBe(false);

      const revealed = cardRepo.reveal(card.id);
      expect(revealed).not.toBeNull();
      expect(revealed!.isRevealed).toBe(true);
    });
  });

  describe('delete', () => {
    it('returns true and card is no longer findable', () => {
      const card = cardRepo.create(roomId, 'went-well', 'Delete me', authorId, []);

      const result = cardRepo.delete(card.id);
      expect(result).toBe(true);

      const found = cardRepo.findById(card.id);
      expect(found).toBeNull();
    });

    it('returns false when card does not exist', () => {
      const result = cardRepo.delete('ghost-card-id');
      expect(result).toBe(false);
    });
  });
});
