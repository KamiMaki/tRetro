import { getDb } from '../connection';
import { generateId } from '../../utils/id';

export const voteRepo = {
  toggle(cardId: string, roomId: string, participantId: string): boolean {
    const db = getDb();
    const existing = db.prepare(
      'SELECT id FROM votes WHERE card_id = ? AND participant_id = ?'
    ).get(cardId, participantId) as { id: string } | undefined;

    if (existing) {
      db.prepare('DELETE FROM votes WHERE id = ?').run(existing.id);
      return false; // removed
    } else {
      const id = generateId();
      db.prepare(
        'INSERT INTO votes (id, card_id, room_id, participant_id) VALUES (?, ?, ?, ?)'
      ).run(id, cardId, roomId, participantId);
      return true; // added
    }
  },

  getCountByCardId(cardId: string): number {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM votes WHERE card_id = ?').get(cardId) as { count: number };
    return row.count;
  },

  hasVoted(cardId: string, participantId: string): boolean {
    const db = getDb();
    const row = db.prepare(
      'SELECT id FROM votes WHERE card_id = ? AND participant_id = ?'
    ).get(cardId, participantId);
    return !!row;
  },

  getVoterIds(cardId: string): string[] {
    const db = getDb();
    const rows = db.prepare('SELECT participant_id FROM votes WHERE card_id = ?').all(cardId) as Array<{ participant_id: string }>;
    return rows.map(r => r.participant_id);
  },
};
