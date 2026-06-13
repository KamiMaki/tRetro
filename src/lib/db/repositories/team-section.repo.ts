import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import { templateSections } from '../../templates';
import type { TeamSection, SectionTone } from '../../types';

interface TeamSectionRow {
  id: string;
  team_id: string;
  section_key: string;
  label: string;
  emoji: string;
  tone: string;
  position: number;
}

function toTeamSection(row: TeamSectionRow): TeamSection {
  return {
    id: row.id,
    teamId: row.team_id,
    sectionKey: row.section_key,
    label: row.label,
    emoji: row.emoji,
    tone: row.tone as SectionTone,
    position: row.position,
  };
}

export const teamSectionRepo = {
  /** A team's default layout in order. Empty when the team has never
   *  customised (callers fall back to the template). */
  findByTeamId(teamId: string): TeamSection[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM team_sections WHERE team_id = ? ORDER BY position, rowid')
      .all(teamId) as TeamSectionRow[];
    return rows.map(toTeamSection);
  },

  findById(id: string): TeamSection | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM team_sections WHERE id = ?').get(id) as
      | TeamSectionRow
      | undefined;
    return row ? toTeamSection(row) : null;
  },

  /**
   * Initialise a team's default layout from a template the first time they
   * open team settings. No-op if they already have sections.
   */
  seedFromTemplate(teamId: string, templateId: string | null | undefined): TeamSection[] {
    const db = getDb();
    const existing = db
      .prepare('SELECT COUNT(*) AS n FROM team_sections WHERE team_id = ?')
      .get(teamId) as { n: number };
    if (existing.n === 0) {
      const insert = db.prepare(
        'INSERT INTO team_sections (id, team_id, section_key, label, emoji, tone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      db.transaction(() => {
        for (const r of templateSections(templateId)) {
          insert.run(generateId(), teamId, r.sectionKey, r.label, r.emoji, r.tone, r.position);
        }
      })();
    }
    return this.findByTeamId(teamId);
  },

  create(
    teamId: string,
    sectionKey: string,
    label: string,
    emoji: string,
    tone: SectionTone,
    position?: number,
  ): TeamSection {
    const db = getDb();
    const id = generateId();
    const pos =
      position ??
      ((db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM team_sections WHERE team_id = ?').get(teamId) as { p: number }).p);
    db.prepare(
      'INSERT INTO team_sections (id, team_id, section_key, label, emoji, tone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, teamId, sectionKey, label, emoji, tone, pos);
    return this.findById(id)!;
  },

  update(
    id: string,
    updates: { label?: string; emoji?: string; tone?: SectionTone; position?: number },
  ): TeamSection | null {
    const db = getDb();
    const sets: string[] = [];
    const vals: Array<string | number> = [];
    if (updates.label !== undefined) { sets.push('label = ?'); vals.push(updates.label); }
    if (updates.emoji !== undefined) { sets.push('emoji = ?'); vals.push(updates.emoji); }
    if (updates.tone !== undefined) { sets.push('tone = ?'); vals.push(updates.tone); }
    if (updates.position !== undefined) { sets.push('position = ?'); vals.push(updates.position); }
    if (sets.length > 0) {
      vals.push(id);
      db.prepare(`UPDATE team_sections SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM team_sections WHERE id = ?').run(id);
    return info.changes > 0;
  },

  reorder(teamId: string, orderedIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE team_sections SET position = ? WHERE id = ? AND team_id = ?');
    db.transaction(() => {
      orderedIds.forEach((id, i) => stmt.run(i, id, teamId));
    })();
  },

  /**
   * Replace a team's entire default layout in one transaction: delete all
   * existing rows and re-insert `rows` in the given order (position = array
   * index). Each row reuses its `sectionKey` when supplied, else a fresh
   * generated key. Returns the new ordered list.
   *
   * Used by the team-settings PUT — the editor sends the full desired list
   * and we make the DB match it atomically (no partial state if a row fails).
   */
  replaceAll(
    teamId: string,
    rows: Array<{ sectionKey?: string; label: string; emoji: string; tone: SectionTone }>,
  ): TeamSection[] {
    const db = getDb();
    const del = db.prepare('DELETE FROM team_sections WHERE team_id = ?');
    const insert = db.prepare(
      'INSERT INTO team_sections (id, team_id, section_key, label, emoji, tone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    db.transaction(() => {
      del.run(teamId);
      rows.forEach((r, i) => {
        const sectionKey = r.sectionKey && r.sectionKey.trim() ? r.sectionKey : `custom-${generateId(8)}`;
        insert.run(generateId(), teamId, sectionKey, r.label, r.emoji, r.tone, i);
      });
    })();
    return this.findByTeamId(teamId);
  },
};
