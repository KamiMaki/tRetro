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
        (SELECT COUNT(*) FROM action_items a WHERE a.room_id = r.id) as action_item_count,
        (SELECT COUNT(*) FROM cards c WHERE c.room_id = r.id AND c.section = 'went-well')  as count_went_well,
        (SELECT COUNT(*) FROM cards c WHERE c.room_id = r.id AND c.section = 'to-improve') as count_to_improve,
        (SELECT COUNT(*) FROM cards c WHERE c.room_id = r.id AND c.section = 'thanks')     as count_thanks,
        (SELECT COUNT(*) FROM cards c WHERE c.room_id = r.id AND c.section = 'deep-dive')  as count_deep_dive,
        (SELECT MAX(created_at) FROM cards        WHERE room_id = r.id) as last_card_at,
        (SELECT MAX(created_at) FROM comments     WHERE room_id = r.id) as last_comment_at,
        (SELECT MAX(created_at) FROM action_items WHERE room_id = r.id) as last_action_at
      FROM rooms r
      ORDER BY r.created_at DESC
    `).all() as Array<RoomRow & {
      participant_count: number;
      card_count: number;
      action_item_count: number;
      count_went_well: number;
      count_to_improve: number;
      count_thanks: number;
      count_deep_dive: number;
      last_card_at: string | null;
      last_comment_at: string | null;
      last_action_at: string | null;
    }>;

    return rows.map(r => {
      const candidates: Array<string | null> = [
        r.last_card_at,
        r.last_comment_at,
        r.last_action_at,
        r.closed_at,
        r.created_at,
      ];
      const lastActivityAt = candidates
        .filter((v): v is string => !!v)
        .reduce((a, b) => (a > b ? a : b), r.created_at);
      return {
        id: r.id,
        name: r.name,
        status: r.status as Room['status'],
        createdAt: r.created_at,
        closedAt: r.closed_at,
        participantCount: r.participant_count,
        cardCount: r.card_count,
        actionItemCount: r.action_item_count,
        lastActivityAt,
        sectionCounts: {
          'went-well': r.count_went_well,
          'to-improve': r.count_to_improve,
          'thanks': r.count_thanks,
          'deep-dive': r.count_deep_dive,
        },
      };
    });
  },

  close(id: string): Room | null {
    const db = getDb();
    db.prepare(
      "UPDATE rooms SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },

  reopen(id: string): Room | null {
    const db = getDb();
    db.prepare(
      "UPDATE rooms SET status = 'active', closed_at = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },
};
