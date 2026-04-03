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
  created_at: string;
}

function toComment(row: CommentRow): Comment {
  const author = participantRepo.findById(row.author_id);
  return {
    id: row.id,
    cardId: row.card_id,
    roomId: row.room_id,
    authorId: row.author_id,
    authorNickname: author?.nickname ?? 'Unknown',
    content: row.content,
    createdAt: row.created_at,
  };
}

export const commentRepo = {
  create(cardId: string, roomId: string, authorId: string, content: string): Comment {
    const db = getDb();
    const id = generateId();
    db.prepare(
      'INSERT INTO comments (id, card_id, room_id, author_id, content) VALUES (?, ?, ?, ?, ?)'
    ).run(id, cardId, roomId, authorId, content);
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
};
