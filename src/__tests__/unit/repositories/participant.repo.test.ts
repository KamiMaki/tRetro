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

describe('participantRepo', () => {
  let roomId: string;

  beforeEach(() => {
    const room = roomRepo.create('Test Room');
    roomId = room.id;
  });

  describe('create', () => {
    it('first participant in a room is assigned ScrumMaster', () => {
      const p = participantRepo.create(roomId, 'Alice');

      expect(p.id).toBeDefined();
      expect(p.roomId).toBe(roomId);
      expect(p.nickname).toBe('Alice');
      expect(p.isScrumMaster).toBe(true);
      expect(p.sessionToken).toBeDefined();
      expect(typeof p.sessionToken).toBe('string');
      expect(p.sessionToken.length).toBeGreaterThan(0);
      expect(p.isOnline).toBe(true);
      expect(p.joinedAt).toBeDefined();
    });

    it('second participant in a room is NOT ScrumMaster', () => {
      participantRepo.create(roomId, 'Alice');
      const p2 = participantRepo.create(roomId, 'Bob');

      expect(p2.isScrumMaster).toBe(false);
      expect(p2.nickname).toBe('Bob');
    });

    it('each participant receives a unique sessionToken', () => {
      const p1 = participantRepo.create(roomId, 'Alice');
      const p2 = participantRepo.create(roomId, 'Bob');
      expect(p1.sessionToken).not.toBe(p2.sessionToken);
    });

    it('first participant in a different room is also ScrumMaster', () => {
      participantRepo.create(roomId, 'Alice'); // SM in room1

      const room2 = roomRepo.create('Room 2');
      const pRoom2 = participantRepo.create(room2.id, 'Bob');
      expect(pRoom2.isScrumMaster).toBe(true);
    });
  });

  describe('findById', () => {
    it('returns the participant when it exists', () => {
      const created = participantRepo.create(roomId, 'Carol');
      const found = participantRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.nickname).toBe('Carol');
    });

    it('returns null when participant does not exist', () => {
      const found = participantRepo.findById('ghost-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySessionToken', () => {
    it('returns the correct participant for a given token', () => {
      const p = participantRepo.create(roomId, 'Dave');
      const found = participantRepo.findBySessionToken(p.sessionToken);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(p.id);
      expect(found!.nickname).toBe('Dave');
    });

    it('returns null for an unknown token', () => {
      const found = participantRepo.findBySessionToken('bad-token');
      expect(found).toBeNull();
    });
  });

  describe('findByRoomId', () => {
    it('returns all participants for a room in join order', () => {
      const p1 = participantRepo.create(roomId, 'Alice');
      const p2 = participantRepo.create(roomId, 'Bob');
      const p3 = participantRepo.create(roomId, 'Carol');

      const all = participantRepo.findByRoomId(roomId);
      expect(all).toHaveLength(3);
      expect(all.map(p => p.id)).toContain(p1.id);
      expect(all.map(p => p.id)).toContain(p2.id);
      expect(all.map(p => p.id)).toContain(p3.id);
    });

    it('returns an empty array for a room with no participants', () => {
      const emptyRoom = roomRepo.create('Empty Room');
      const all = participantRepo.findByRoomId(emptyRoom.id);
      expect(all).toHaveLength(0);
    });

    it('does not return participants from other rooms', () => {
      participantRepo.create(roomId, 'Alice');
      const room2 = roomRepo.create('Room 2');
      participantRepo.create(room2.id, 'Bob');

      const all = participantRepo.findByRoomId(roomId);
      expect(all).toHaveLength(1);
      expect(all[0].nickname).toBe('Alice');
    });
  });

  describe('setOnline', () => {
    it('sets participant offline', () => {
      const p = participantRepo.create(roomId, 'Eve');
      expect(p.isOnline).toBe(true);

      participantRepo.setOnline(p.id, false);
      const updated = participantRepo.findById(p.id);
      expect(updated!.isOnline).toBe(false);
    });

    it('sets participant back online', () => {
      const p = participantRepo.create(roomId, 'Frank');
      participantRepo.setOnline(p.id, false);
      participantRepo.setOnline(p.id, true);

      const updated = participantRepo.findById(p.id);
      expect(updated!.isOnline).toBe(true);
    });
  });
});
