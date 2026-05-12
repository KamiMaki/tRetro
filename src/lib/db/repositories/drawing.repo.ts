import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import type { Drawing } from '../../types';

interface DrawingRow {
  id: string;
  card_id: string;
  room_id: string;
  author_id: string;
  data: string;
  created_at: string;
}

function toDrawing(row: DrawingRow): Drawing {
  return {
    id: row.id,
    cardId: row.card_id,
    roomId: row.room_id,
    data: row.data,
    createdAt: row.created_at,
  };
}

export const drawingRepo = {
  create(cardId: string, roomId: string, authorId: string, data: string): Drawing {
    const db = getDb();
    const id = generateId();
    db.prepare(
      'INSERT INTO drawings (id, card_id, room_id, author_id, data) VALUES (?, ?, ?, ?, ?)'
    ).run(id, cardId, roomId, authorId, data);
    return this.findById(id)!;
  },

  findById(id: string): Drawing | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM drawings WHERE id = ?').get(id) as DrawingRow | undefined;
    return row ? toDrawing(row) : null;
  },

  findByCardId(cardId: string): Drawing[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM drawings WHERE card_id = ? ORDER BY created_at').all(cardId) as DrawingRow[];
    return rows.map(toDrawing);
  },

  /** Return the row's author_id, useful for permission checks. */
  authorIdFor(id: string): string | null {
    const db = getDb();
    const row = db.prepare('SELECT author_id FROM drawings WHERE id = ?').get(id) as { author_id: string } | undefined;
    return row?.author_id ?? null;
  },

  /** Delete by id. Returns true if a row was removed. */
  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM drawings WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
