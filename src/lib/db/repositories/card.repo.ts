import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import type { CardDB, Tag } from '../../types';

interface CardRow {
  id: string;
  room_id: string;
  section: string;
  content: string;
  author_id: string;
  is_revealed: number;
  revealed_nickname: string | null;
  is_parked: number;
  created_at: string;
  updated_at: string;
}

interface TagRow {
  id: string;
  room_id: string;
  name: string;
  color: string;
  is_default: number;
}

function toCardDB(row: CardRow): CardDB {
  return {
    id: row.id,
    roomId: row.room_id,
    section: row.section as CardDB['section'],
    content: row.content,
    authorId: row.author_id,
    isRevealed: row.is_revealed === 1,
    revealedNickname: row.revealed_nickname ?? null,
    isParked: row.is_parked === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const cardRepo = {
  create(roomId: string, section: string, content: string, authorId: string, tagIds: string[]): CardDB {
    const db = getDb();
    const id = generateId();

    db.transaction(() => {
      db.prepare(
        'INSERT INTO cards (id, room_id, section, content, author_id) VALUES (?, ?, ?, ?, ?)'
      ).run(id, roomId, section, content, authorId);

      const insertTag = db.prepare('INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)');
      for (const tagId of tagIds) {
        insertTag.run(id, tagId);
      }
    })();

    return this.findById(id)!;
  },

  findById(id: string): CardDB | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined;
    return row ? toCardDB(row) : null;
  },

  findByRoomId(roomId: string): CardDB[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM cards WHERE room_id = ? ORDER BY created_at').all(roomId) as CardRow[];
    return rows.map(toCardDB);
  },

  getTagsForCard(cardId: string): Tag[] {
    const db = getDb();
    const rows = db
      .prepare(
        'SELECT t.* FROM tags t JOIN card_tags ct ON t.id = ct.tag_id WHERE ct.card_id = ?',
      )
      .all(cardId) as TagRow[];
    return rows.map((r) => ({
      id: r.id,
      roomId: r.room_id,
      name: r.name,
      color: r.color,
      isDefault: r.is_default === 1,
    }));
  },

  update(id: string, updates: { content?: string; tagIds?: string[]; section?: string }): CardDB | null {
    const db = getDb();
    db.transaction(() => {
      if (updates.content !== undefined) {
        db.prepare(
          "UPDATE cards SET content = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(updates.content, id);
      }
      if (updates.section !== undefined) {
        db.prepare(
          "UPDATE cards SET section = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(updates.section, id);
      }
      if (updates.tagIds !== undefined) {
        db.prepare('DELETE FROM card_tags WHERE card_id = ?').run(id);
        const insertTag = db.prepare('INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)');
        for (const tagId of updates.tagIds) {
          insertTag.run(id, tagId);
        }
      }
    })();
    return this.findById(id);
  },

  reveal(id: string, nickname: string): CardDB | null {
    const db = getDb();
    db.prepare(
      "UPDATE cards SET is_revealed = 1, revealed_nickname = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(nickname, id);
    return this.findById(id);
  },

  unreveal(id: string): CardDB | null {
    const db = getDb();
    db.prepare(
      "UPDATE cards SET is_revealed = 0, revealed_nickname = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },

  setParked(id: string, isParked: boolean): CardDB | null {
    const db = getDb();
    db.prepare(
      "UPDATE cards SET is_parked = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(isParked ? 1 : 0, id);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
