import { getDb } from '../connection';
import { generateRoomId } from '../../utils/id';
import type { Room, RoomSummary } from '../../types';

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

  findAll(): RoomSummary[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        r.id, r.name, r.status, r.created_at, r.closed_at,
        (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count,
        (SELECT COUNT(*) FROM cards c WHERE c.room_id = r.id) as card_count,
        (SELECT COUNT(*) FROM action_items a WHERE a.room_id = r.id) as action_item_count
      FROM rooms r
      ORDER BY r.created_at DESC
    `).all() as Array<RoomRow & { participant_count: number; card_count: number; action_item_count: number }>;

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status as Room['status'],
      createdAt: r.created_at,
      closedAt: r.closed_at,
      participantCount: r.participant_count,
      cardCount: r.card_count,
      actionItemCount: r.action_item_count,
    }));
  },

  close(id: string): Room | null {
    const db = getDb();
    db.prepare(
      "UPDATE rooms SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },
};
