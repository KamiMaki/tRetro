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
import { tagRepo } from '@/lib/db/repositories/tag.repo';

describe('tagRepo', () => {
  let roomId: string;

  beforeEach(() => {
    const room = roomRepo.create('Tag Test Room');
    roomId = room.id;
  });

  describe('create', () => {
    it('returns a tag with correct fields', () => {
      const tag = tagRepo.create(roomId, 'Bug', '#ef4444');

      expect(tag.id).toBeDefined();
      expect(typeof tag.id).toBe('string');
      expect(tag.roomId).toBe(roomId);
      expect(tag.name).toBe('Bug');
      expect(tag.color).toBe('#ef4444');
    });

    it('creates tags with different names in the same room', () => {
      const t1 = tagRepo.create(roomId, 'Bug', '#ef4444');
      const t2 = tagRepo.create(roomId, 'Feature', '#3b82f6');

      expect(t1.id).not.toBe(t2.id);
      expect(t1.name).toBe('Bug');
      expect(t2.name).toBe('Feature');
    });
  });

  describe('findById', () => {
    it('returns the tag when it exists', () => {
      const created = tagRepo.create(roomId, 'Process', '#6B7280');
      const found = tagRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Process');
    });

    it('returns null when tag does not exist', () => {
      const found = tagRepo.findById('no-such-tag');
      expect(found).toBeNull();
    });
  });

  describe('findByRoomId', () => {
    it('returns all tags for a room ordered by name', () => {
      tagRepo.create(roomId, 'Zebra', '#000000');
      tagRepo.create(roomId, 'Alpha', '#ffffff');
      tagRepo.create(roomId, 'Middle', '#888888');

      const tags = tagRepo.findByRoomId(roomId);
      expect(tags).toHaveLength(3);
      expect(tags[0].name).toBe('Alpha');
      expect(tags[1].name).toBe('Middle');
      expect(tags[2].name).toBe('Zebra');
    });

    it('returns empty array for a room with no tags', () => {
      const emptyRoom = roomRepo.create('Empty Room');
      const tags = tagRepo.findByRoomId(emptyRoom.id);
      expect(tags).toHaveLength(0);
    });

    it('does not return tags from other rooms', () => {
      tagRepo.create(roomId, 'Room1Tag', '#111111');
      const room2 = roomRepo.create('Room 2');
      tagRepo.create(room2.id, 'Room2Tag', '#222222');

      const tags = tagRepo.findByRoomId(roomId);
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('Room1Tag');
    });
  });

  describe('unique constraint', () => {
    it('throws when creating a duplicate tag name in the same room', () => {
      tagRepo.create(roomId, 'Duplicate', '#aabbcc');

      expect(() => {
        tagRepo.create(roomId, 'Duplicate', '#112233');
      }).toThrow();
    });

    it('allows the same tag name in different rooms', () => {
      const room2 = roomRepo.create('Room 2');
      tagRepo.create(roomId, 'SharedName', '#111111');

      expect(() => {
        tagRepo.create(room2.id, 'SharedName', '#222222');
      }).not.toThrow();
    });
  });
});
