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
import { actionItemRepo } from '@/lib/db/repositories/action-item.repo';

describe('actionItemRepo', () => {
  let roomId: string;

  beforeEach(() => {
    const room = roomRepo.create('Action Item Room');
    roomId = room.id;
  });

  describe('create', () => {
    it('creates an action item with required fields only', () => {
      const item = actionItemRepo.create(roomId, 'Fix the pipeline');

      expect(item.id).toBeDefined();
      expect(item.roomId).toBe(roomId);
      expect(item.description).toBe('Fix the pipeline');
      expect(item.assignee).toBeNull();
      expect(item.dueDate).toBeNull();
      expect(item.isCompleted).toBe(false);
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
    });

    it('creates an action item with assignee and dueDate', () => {
      const item = actionItemRepo.create(roomId, 'Write tests', 'Alice', '2025-01-31');

      expect(item.assignee).toBe('Alice');
      expect(item.dueDate).toBe('2025-01-31');
    });

    it('assigns a unique id to each action item', () => {
      const i1 = actionItemRepo.create(roomId, 'Task 1');
      const i2 = actionItemRepo.create(roomId, 'Task 2');
      expect(i1.id).not.toBe(i2.id);
    });
  });

  describe('findById', () => {
    it('returns the action item when it exists', () => {
      const created = actionItemRepo.create(roomId, 'Refactor auth');
      const found = actionItemRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.description).toBe('Refactor auth');
    });

    it('returns null when action item does not exist', () => {
      const found = actionItemRepo.findById('missing-id');
      expect(found).toBeNull();
    });
  });

  describe('findByRoomId', () => {
    it('returns all action items for a room', () => {
      actionItemRepo.create(roomId, 'Task A');
      actionItemRepo.create(roomId, 'Task B');
      actionItemRepo.create(roomId, 'Task C');

      const items = actionItemRepo.findByRoomId(roomId);
      expect(items).toHaveLength(3);
    });

    it('returns empty array for a room with no action items', () => {
      const emptyRoom = roomRepo.create('Empty');
      const items = actionItemRepo.findByRoomId(emptyRoom.id);
      expect(items).toHaveLength(0);
    });

    it('does not return action items from other rooms', () => {
      actionItemRepo.create(roomId, 'Room1 Task');
      const room2 = roomRepo.create('Room 2');
      actionItemRepo.create(room2.id, 'Room2 Task');

      const items = actionItemRepo.findByRoomId(roomId);
      expect(items).toHaveLength(1);
      expect(items[0].description).toBe('Room1 Task');
    });
  });

  describe('update', () => {
    it('updates the description', () => {
      const item = actionItemRepo.create(roomId, 'Old desc');
      const updated = actionItemRepo.update(item.id, { description: 'New desc' });

      expect(updated).not.toBeNull();
      expect(updated!.description).toBe('New desc');
    });

    it('updates the assignee', () => {
      const item = actionItemRepo.create(roomId, 'Some task');
      const updated = actionItemRepo.update(item.id, { assignee: 'Bob' });

      expect(updated!.assignee).toBe('Bob');
    });

    it('sets assignee to null to unassign', () => {
      const item = actionItemRepo.create(roomId, 'Assigned task', 'Alice');
      const updated = actionItemRepo.update(item.id, { assignee: null });

      expect(updated!.assignee).toBeNull();
    });

    it('marks as completed', () => {
      const item = actionItemRepo.create(roomId, 'Do something');
      expect(item.isCompleted).toBe(false);

      const updated = actionItemRepo.update(item.id, { isCompleted: true });
      expect(updated!.isCompleted).toBe(true);
    });

    it('returns item unchanged when no updates provided', () => {
      const item = actionItemRepo.create(roomId, 'No change');
      const updated = actionItemRepo.update(item.id, {});

      expect(updated!.description).toBe('No change');
    });
  });

  describe('delete', () => {
    it('returns true and removes the action item', () => {
      const item = actionItemRepo.create(roomId, 'Delete me');

      const result = actionItemRepo.delete(item.id);
      expect(result).toBe(true);

      const found = actionItemRepo.findById(item.id);
      expect(found).toBeNull();
    });

    it('returns false when item does not exist', () => {
      const result = actionItemRepo.delete('ghost-id');
      expect(result).toBe(false);
    });
  });
});
