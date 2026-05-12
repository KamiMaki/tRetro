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

// Import after mock is set up
import { roomRepo } from '@/lib/db/repositories/room.repo';

describe('roomRepo', () => {
  describe('create', () => {
    it('returns a room with id, name, status=active, and createdAt', () => {
      const room = roomRepo.create('Sprint 42 Retro');

      expect(room.id).toBeDefined();
      expect(typeof room.id).toBe('string');
      expect(room.id.length).toBeGreaterThan(0);
      expect(room.name).toBe('Sprint 42 Retro');
      expect(room.status).toBe('active');
      expect(room.createdAt).toBeDefined();
      expect(room.updatedAt).toBeDefined();
      expect(room.closedAt).toBeNull();
    });

    it('assigns a unique id to each room', () => {
      const room1 = roomRepo.create('Room A');
      const room2 = roomRepo.create('Room B');
      expect(room1.id).not.toBe(room2.id);
    });
  });

  describe('findById', () => {
    it('returns the room when it exists', () => {
      const created = roomRepo.create('My Retro');
      const found = roomRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('My Retro');
      expect(found!.status).toBe('active');
    });

    it('returns null when room does not exist', () => {
      const found = roomRepo.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('close', () => {
    it('sets status to closed and populates closedAt', () => {
      const room = roomRepo.create('Closing Room');
      expect(room.status).toBe('active');
      expect(room.closedAt).toBeNull();

      const closed = roomRepo.close(room.id);

      expect(closed).not.toBeNull();
      expect(closed!.status).toBe('closed');
      expect(closed!.closedAt).not.toBeNull();
      expect(typeof closed!.closedAt).toBe('string');
    });

    it('returns null when closing a non-existent room', () => {
      const result = roomRepo.close('does-not-exist');
      expect(result).toBeNull();
    });

    it('persists the closed state on subsequent findById calls', () => {
      const room = roomRepo.create('Persist Close');
      roomRepo.close(room.id);
      const fetched = roomRepo.findById(room.id);
      expect(fetched!.status).toBe('closed');
    });
  });

  describe('delete', () => {
    it('returns true and removes the room when it exists', () => {
      const room = roomRepo.create('Doomed Room');
      const removed = roomRepo.delete(room.id);
      expect(removed).toBe(true);
      expect(roomRepo.findById(room.id)).toBeNull();
    });

    it('returns false for an unknown id (idempotent)', () => {
      const removed = roomRepo.delete('never-existed');
      expect(removed).toBe(false);
    });

    it('cascades through child rows (cards, action_items, participants)', () => {
      const room = roomRepo.create('Cascade Test');

      testDb
        .prepare("INSERT INTO participants (id, room_id, nickname, session_token) VALUES (?, ?, ?, ?)")
        .run('p1', room.id, 'Tester', 'tok-1');
      testDb
        .prepare("INSERT INTO cards (id, room_id, author_id, section, content) VALUES (?, ?, ?, ?, ?)")
        .run('c1', room.id, 'p1', 'went-well', 'great sprint');
      // action_items has no FK to participants — description is enough.
      testDb
        .prepare("INSERT INTO action_items (id, room_id, description) VALUES (?, ?, ?)")
        .run('a1', room.id, 'follow up');

      roomRepo.delete(room.id);

      const partLeft = testDb.prepare('SELECT COUNT(*) as n FROM participants WHERE room_id = ?').get(room.id) as { n: number };
      const cardsLeft = testDb.prepare('SELECT COUNT(*) as n FROM cards WHERE room_id = ?').get(room.id) as { n: number };
      const actionsLeft = testDb.prepare('SELECT COUNT(*) as n FROM action_items WHERE room_id = ?').get(room.id) as { n: number };
      expect(partLeft.n).toBe(0);
      expect(cardsLeft.n).toBe(0);
      expect(actionsLeft.n).toBe(0);
    });

    it('does not affect sibling rooms', () => {
      const keep = roomRepo.create('Keep me');
      const drop = roomRepo.create('Drop me');
      roomRepo.delete(drop.id);
      expect(roomRepo.findById(keep.id)).not.toBeNull();
      expect(roomRepo.findById(drop.id)).toBeNull();
    });
  });
});
