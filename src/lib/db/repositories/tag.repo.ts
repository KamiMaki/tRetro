import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import type { Tag } from '../../types';

interface TagRow {
  id: string;
  room_id: string;
  name: string;
  color: string;
  is_default: number;
}

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    color: row.color,
    isDefault: row.is_default === 1,
  };
}

export const tagRepo = {
  create(roomId: string, name: string, color: string, isDefault = false): Tag {
    const db = getDb();
    const id = generateId(8);
    db.prepare(
      'INSERT INTO tags (id, room_id, name, color, is_default) VALUES (?, ?, ?, ?, ?)'
    ).run(id, roomId, name, color, isDefault ? 1 : 0);
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

  findDefaultsByRoomId(roomId: string): Tag[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM tags WHERE room_id = ? AND is_default = 1')
      .all(roomId) as TagRow[];
    return rows.map(toTag);
  },

  setDefault(id: string, isDefault: boolean): Tag | null {
    const db = getDb();
    db.prepare('UPDATE tags SET is_default = ? WHERE id = ?').run(isDefault ? 1 : 0, id);
    return this.findById(id);
  },
};
