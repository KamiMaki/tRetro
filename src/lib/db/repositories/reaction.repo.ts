import { getDb } from '../connection';
import { generateId } from '../../utils/id';

interface ReactionRow {
  id: string;
  card_id: string;
  room_id: string;
  participant_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  participantIds: string[];
}

export const reactionRepo = {
  toggle(cardId: string, roomId: string, participantId: string, emoji: string): boolean {
    const db = getDb();
    const existing = db.prepare(
      'SELECT id FROM reactions WHERE card_id = ? AND participant_id = ? AND emoji = ?'
    ).get(cardId, participantId, emoji) as { id: string } | undefined;

    if (existing) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
      return false; // removed
    } else {
      const id = generateId();
      db.prepare(
        'INSERT INTO reactions (id, card_id, room_id, participant_id, emoji) VALUES (?, ?, ?, ?, ?)'
      ).run(id, cardId, roomId, participantId, emoji);
      return true; // added
    }
  },

  getByCardId(cardId: string): ReactionSummary[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT emoji, COUNT(*) as count, GROUP_CONCAT(participant_id) as pids FROM reactions WHERE card_id = ? GROUP BY emoji'
    ).all(cardId) as Array<{ emoji: string; count: number; pids: string }>;
    return rows.map(r => ({
      emoji: r.emoji,
      count: r.count,
      participantIds: r.pids.split(','),
    }));
  },
};
