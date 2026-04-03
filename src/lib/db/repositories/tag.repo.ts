import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import type { Tag } from '../../types';

interface TagRow {
  id: string;
  room_id: string;
  name: string;
  color: string;
}

function toTag(row: TagRow): Tag {
  return { id: row.id, roomId: row.room_id, name: row.name, color: row.color };
}

export const tagRepo = {
  create(roomId: string, name: string, color: string): Tag {
    const db = getDb();
    const id = generateId(8);
    db.prepare(
      'INSERT INTO tags (id, room_id, name, color) VALUES (?, ?, ?, ?)'
    ).run(id, roomId, name, color);
    return this.findById(id)!;
  },

  findById(id: string): Tag | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow | undefined;
    return row ? toTag(row) : null;
  },

  findByRoomId(roomId: string): Tag[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM tags WHERE room_id = ? ORDER BY name').all(roomId) as TagRow[];
    return rows.map(toTag);
  },
};
