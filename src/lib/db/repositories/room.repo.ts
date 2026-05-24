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
  webhook_url: string | null;
  template_id: string | null;
  team_id: string | null;
  participant_count: number | null;
  is_anonymous: number | null;
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    status: row.status as Room['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    webhookUrl: row.webhook_url ?? null,
    templateId: row.template_id ?? 'classic',
    teamId: row.team_id ?? null,
    participantCount: row.participant_count ?? null,
    isAnonymous: row.is_anonymous === 1,
  };
}

interface RoomSummaryRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  template_id: string | null;
  team_id: string | null;
  configured_participant_count: number | null;
  is_anonymous: number | null;
  session_participant_count: number;
  card_count: number;
  action_item_count: number;
  count_went_well: number;
  count_to_improve: number;
  count_thanks: number;
  count_deep_dive: number;
  last_card_at: string | null;
  last_comment_at: string | null;
  last_action_at: string | null;
}

const SUMMARY_SELECT = `
  SELECT
    r.id, r.name, r.status, r.created_at, r.closed_at, r.template_id,
    r.team_id, r.participant_count as configured_participant_count, r.is_anonymous,
    (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as session_participant_count,
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
`;

function toSummary(r: RoomSummaryRow): RoomSummary {
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
    participantCount: r.session_participant_count, // compat alias
    sessionParticipantCount: r.session_participant_count,
    configuredParticipantCount: r.configured_participant_count,
    cardCount: r.card_count,
    actionItemCount: r.action_item_count,
    lastActivityAt,
    sectionCounts: {
      'went-well': r.count_went_well,
      'to-improve': r.count_to_improve,
      'thanks': r.count_thanks,
      'deep-dive': r.count_deep_dive,
    },
    templateId: r.template_id ?? 'classic',
    teamId: r.team_id,
    isAnonymous: r.is_anonymous === 1,
  };
}

export const roomRepo = {
  /**
   * Create a room. `teamId` is optional only because the test suite and
   * legacy code paths still create teamless rooms; production API routes
   * always pass it (`requireTeamId` gates the POST). When set, this is the
   * room's owning tenant; when null, the room becomes "unclaimed" and is
   * visible to any logged-in user until a team claims it.
   */
  create(
    name: string,
    templateId: string = 'classic',
    teamId: string | null = null,
    participantCount: number | null = null,
    isAnonymous: boolean = false,
  ): Room {
    const db = getDb();
    const id = generateRoomId();
    db.prepare(
      'INSERT INTO rooms (id, name, template_id, team_id, participant_count, is_anonymous) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, templateId, teamId, participantCount, isAnonymous ? 1 : 0);
    return this.findById(id)!;
  },

  findById(id: string): Room | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
    return row ? toRoom(row) : null;
  },

  /**
   * Backwards-compat global listing. New code should call
   * `findByTeamId` and `findUnclaimed` so cross-team data never leaks.
   * Kept for the existing test suite and any non-API callers.
   */
  findAll(): RoomSummary[] {
    const db = getDb();
    const rows = db
      .prepare(`${SUMMARY_SELECT} ORDER BY r.created_at DESC`)
      .all() as RoomSummaryRow[];
    return rows.map(toSummary);
  },

  /** Rooms owned by `teamId`. Empty when the team has no rooms. */
  findByTeamId(teamId: string): RoomSummary[] {
    const db = getDb();
    const rows = db
      .prepare(`${SUMMARY_SELECT} WHERE r.team_id = ? ORDER BY r.created_at DESC`)
      .all(teamId) as RoomSummaryRow[];
    return rows.map(toSummary);
  },

  /** Legacy rooms whose `team_id IS NULL`. Visible to any logged-in user. */
  findUnclaimed(): RoomSummary[] {
    const db = getDb();
    const rows = db
      .prepare(`${SUMMARY_SELECT} WHERE r.team_id IS NULL ORDER BY r.created_at DESC`)
      .all() as RoomSummaryRow[];
    return rows.map(toSummary);
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

  updateWebhook(id: string, url: string | null): Room | null {
    const db = getDb();
    db.prepare(
      "UPDATE rooms SET webhook_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(url, id);
    return this.findById(id);
  },

  /**
   * Permanently delete a room and everything that hangs off it.
   * All child tables (cards, tags, comments, reactions, votes, drawings,
   * action_items, participants, metric_scores, …) are wired with
   * `ON DELETE CASCADE` on `room_id`, and `foreign_keys = ON` is set in
   * connection.ts, so a single statement drops the entire subtree.
   *
   * Returns true if a row was actually deleted, false if the id was
   * unknown (idempotent for repeat-clicks from the dashboard).
   */
  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
