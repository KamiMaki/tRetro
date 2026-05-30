import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import { participantRepo } from './participant.repo';
import type { Comment } from '../../types';

interface CommentRow {
  id: string;
  card_id: string;
  room_id: string;
  author_id: string;
  content: string;
  image_data: string | null;
  created_at: string;
}

function toComment(row: CommentRow): Comment {
  // Always populate the current nickname here. Anonymous-room suppression
  // happens at the DTO layer (toCommentDTO in src/lib/socket/dto.ts) so
  // the DB layer can stay storage-shaped and not room-aware. Null when
  // the author participant row was deleted.
  const author = participantRepo.findById(row.author_id);
  return {
    id: row.id,
    cardId: row.card_id,
    roomId: row.room_id,
    authorId: row.author_id,
    authorNickname: author?.nickname ?? null,
    content: row.content,
    imageData: row.image_data ?? null,
    createdAt: row.created_at,
  };
}

export const commentRepo = {
  create(
    cardId: string,
    roomId: string,
    authorId: string,
    content: string,
    imageData: string | null = null,
  ): Comment {
    const db = getDb();
    const id = generateId();
    db.prepare(
      'INSERT INTO comments (id, card_id, room_id, author_id, content, image_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, cardId, roomId, authorId, content, imageData);
    return this.findById(id)!;
  },

  findById(id: string): Comment | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as CommentRow | undefined;
    return row ? toComment(row) : null;
  },

  findByCardId(cardId: string): Comment[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at').all(cardId) as CommentRow[];
    return rows.map(toComment);
  },

  /** Delete by id. Returns true if a row was removed. */
  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
