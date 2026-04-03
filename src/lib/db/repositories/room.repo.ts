import { getDb } from '../connection';
import { generateRoomId } from '../../utils/id';
import type { Room } from '../../types';

interface RoomRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    status: row.status as Room['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

export const roomRepo = {
  create(name: string): Room {
    const db = getDb();
    const id = generateRoomId();
    db.prepare(
      'INSERT INTO rooms (id, name) VALUES (?, ?)'
    ).run(id, name);
    return this.findById(id)!;
  },

  findById(id: string): Room | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
    return row ? toRoom(row) : null;
  },

  close(id: string): Room | null {
    const db = getDb();
    db.prepare(
      "UPDATE rooms SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },
};
