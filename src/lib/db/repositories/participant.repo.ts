import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import type { Participant } from '../../types';
import crypto from 'crypto';

interface ParticipantRow {
  id: string;
  room_id: string;
  nickname: string;
  is_scrum_master: number;
  session_token: string;
  joined_at: string;
  is_online: number;
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    roomId: row.room_id,
    nickname: row.nickname,
    isScrumMaster: row.is_scrum_master === 1,
    sessionToken: row.session_token,
    joinedAt: row.joined_at,
    isOnline: row.is_online === 1,
  };
}

export const participantRepo = {
  create(roomId: string, nickname: string): Participant {
    const db = getDb();
    const id = generateId();
    const sessionToken = crypto.randomUUID();

    // Use transaction to safely determine SM status
    const result = db.transaction(() => {
      const existing = db.prepare(
        'SELECT COUNT(*) as count FROM participants WHERE room_id = ? AND is_scrum_master = 1'
      ).get(roomId) as { count: number };
      const isScrumMaster = existing.count === 0 ? 1 : 0;

      db.prepare(
        'INSERT INTO participants (id, room_id, nickname, is_scrum_master, session_token) VALUES (?, ?, ?, ?, ?)'
      ).run(id, roomId, nickname, isScrumMaster, sessionToken);

      return this.findById(id)!;
    })();

    return result;
  },

  findById(id: string): Participant | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  },

  findBySessionToken(sessionToken: string): Participant | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM participants WHERE session_token = ?').get(sessionToken) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  },

  findByRoomId(roomId: string): Participant[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at').all(roomId) as ParticipantRow[];
    return rows.map(toParticipant);
  },

  setOnline(id: string, isOnline: boolean): void {
    const db = getDb();
    db.prepare('UPDATE participants SET is_online = ? WHERE id = ?').run(isOnline ? 1 : 0, id);
  },
};
