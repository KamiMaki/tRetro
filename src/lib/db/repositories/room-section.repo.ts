import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import { templateSections } from '../../templates';
import type { RoomSection, SectionTone } from '../../types';

interface RoomSectionRow {
  id: string;
  room_id: string;
  section_key: string;
  label: string;
  emoji: string;
  tone: string;
  position: number;
}

function toRoomSection(row: RoomSectionRow): RoomSection {
  return {
    id: row.id,
    roomId: row.room_id,
    sectionKey: row.section_key,
    label: row.label,
    emoji: row.emoji,
    tone: row.tone as SectionTone,
    position: row.position,
  };
}

export const roomSectionRepo = {
  /** A room's sections in board order. Empty only for un-seeded rooms. */
  findByRoomId(roomId: string): RoomSection[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM room_sections WHERE room_id = ? ORDER BY position, rowid')
      .all(roomId) as RoomSectionRow[];
    return rows.map(toRoomSection);
  },

  findById(id: string): RoomSection | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM room_sections WHERE id = ?').get(id) as
      | RoomSectionRow
      | undefined;
    return row ? toRoomSection(row) : null;
  },

  /**
   * Seed a room's sections. Order of preference:
   *   1. the owning team's team_sections (its saved default layout), else
   *   2. the chosen template's default sections.
   * No-op if the room already has sections (idempotent).
   */
  seed(roomId: string, teamId: string | null, templateId: string | null | undefined): void {
    const db = getDb();
    const existing = db
      .prepare('SELECT COUNT(*) AS n FROM room_sections WHERE room_id = ?')
      .get(roomId) as { n: number };
    if (existing.n > 0) return;

    let rows: Array<{ sectionKey: string; label: string; emoji: string; tone: string; position: number }> = [];
    if (teamId) {
      const teamRows = db
        .prepare('SELECT section_key, label, emoji, tone, position FROM team_sections WHERE team_id = ? ORDER BY position, rowid')
        .all(teamId) as Array<{ section_key: string; label: string; emoji: string; tone: string; position: number }>;
      if (teamRows.length > 0) {
        rows = teamRows.map((r) => ({
          sectionKey: r.section_key,
          label: r.label,
          emoji: r.emoji,
          tone: r.tone,
          position: r.position,
        }));
      }
    }
    if (rows.length === 0) {
      rows = templateSections(templateId);
    }

    const insert = db.prepare(
      'INSERT INTO room_sections (id, room_id, section_key, label, emoji, tone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    db.transaction(() => {
      for (const r of rows) {
        insert.run(generateId(), roomId, r.sectionKey, r.label, r.emoji, r.tone, r.position);
      }
    })();
  },

  /** Add a new section to the end of the board. Returns the created row. */
  create(
    roomId: string,
    sectionKey: string,
    label: string,
    emoji: string,
    tone: SectionTone,
    position?: number,
  ): RoomSection {
    const db = getDb();
    const id = generateId();
    const pos =
      position ??
      ((db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM room_sections WHERE room_id = ?').get(roomId) as { p: number }).p);
    db.prepare(
      'INSERT INTO room_sections (id, room_id, section_key, label, emoji, tone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, roomId, sectionKey, label, emoji, tone, pos);
    return this.findById(id)!;
  },

  update(
    id: string,
    updates: { label?: string; emoji?: string; tone?: SectionTone; position?: number },
  ): RoomSection | null {
    const db = getDb();
    const sets: string[] = [];
    const vals: Array<string | number> = [];
    if (updates.label !== undefined) { sets.push('label = ?'); vals.push(updates.label); }
    if (updates.emoji !== undefined) { sets.push('emoji = ?'); vals.push(updates.emoji); }
    if (updates.tone !== undefined) { sets.push('tone = ?'); vals.push(updates.tone); }
    if (updates.position !== undefined) { sets.push('position = ?'); vals.push(updates.position); }
    if (sets.length > 0) {
      vals.push(id);
      db.prepare(`UPDATE room_sections SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM room_sections WHERE id = ?').run(id);
    return info.changes > 0;
  },

  /** Count cards still assigned to a section_key (guards section removal). */
  cardCount(roomId: string, sectionKey: string): number {
    const db = getDb();
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM cards WHERE room_id = ? AND section = ?')
      .get(roomId, sectionKey) as { n: number };
    return row.n;
  },

  /** Apply an explicit ordering of section ids (positions 0..n-1). */
  reorder(roomId: string, orderedIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE room_sections SET position = ? WHERE id = ? AND room_id = ?');
    db.transaction(() => {
      orderedIds.forEach((id, i) => stmt.run(i, id, roomId));
    })();
  },
};
