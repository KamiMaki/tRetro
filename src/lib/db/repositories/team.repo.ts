import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import { hashTeamPassword, verifyTeamPassword } from '../../utils/teamPassword';
import type { Team, TeamSettings } from '../../types';

interface TeamRow {
  id: string;
  name: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export const teamRepo = {
  /**
   * Create a team with a scrypt-hashed password. Throws on duplicate name
   * (SQLite UNIQUE violation) — the caller (API route) should translate to
   * 409.
   */
  async create(name: string, password: string): Promise<Team> {
    const { hash, salt } = await hashTeamPassword(password);
    const id = generateId();
    const db = getDb();
    db.prepare(
      'INSERT INTO teams (id, name, password_hash, password_salt) VALUES (?, ?, ?, ?)',
    ).run(id, name, hash, salt);
    return this.findById(id)!;
  },

  findById(id: string): Team | null {
    const db = getDb();
    const row = db
      .prepare('SELECT id, name, password_hash, password_salt, created_at FROM teams WHERE id = ?')
      .get(id) as TeamRow | undefined;
    return row ? toTeam(row) : null;
  },

  findByName(name: string): Team | null {
    const db = getDb();
    const row = db
      .prepare(
        'SELECT id, name, password_hash, password_salt, created_at FROM teams WHERE name = ?',
      )
      .get(name) as TeamRow | undefined;
    return row ? toTeam(row) : null;
  },

  /**
   * Public listing — names + ids only, never password material. Used by
   * the team-picker dropdown.
   */
  findAll(): Team[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT id, name, password_hash, password_salt, created_at FROM teams ORDER BY name')
      .all() as TeamRow[];
    return rows.map(toTeam);
  },

  /**
   * Verify a plaintext password against the stored hash. Returns false
   * for unknown team IDs (no oracle: same return shape as wrong password).
   */
  async verifyPassword(teamId: string, plain: string): Promise<boolean> {
    const db = getDb();
    const row = db
      .prepare('SELECT password_hash, password_salt FROM teams WHERE id = ?')
      .get(teamId) as { password_hash: string; password_salt: string } | undefined;
    if (!row) return false;
    return verifyTeamPassword(plain, row.password_hash, row.password_salt);
  },

  /**
   * Read a team's customisation settings (summary prompt + reaction palette).
   * `reaction_emojis` is stored as a JSON array; a malformed/empty value
   * decodes to null so callers fall back to defaults. Returns null for an
   * unknown team id.
   */
  getSettings(teamId: string): TeamSettings | null {
    const db = getDb();
    const row = db
      .prepare('SELECT summary_prompt, reaction_emojis FROM teams WHERE id = ?')
      .get(teamId) as { summary_prompt: string | null; reaction_emojis: string | null } | undefined;
    if (!row) return null;
    return {
      summaryPrompt: row.summary_prompt ?? null,
      reactionEmojis: parseReactionEmojis(row.reaction_emojis),
    };
  },

  /**
   * Patch a team's settings. Only the provided keys are written; passing
   * `null` clears a field back to its default. `reactionEmojis` is
   * JSON-stringified (null → SQL NULL). Returns the updated settings, or
   * null for an unknown team id.
   */
  updateSettings(
    teamId: string,
    updates: { summaryPrompt?: string | null; reactionEmojis?: string[] | null },
  ): TeamSettings | null {
    const db = getDb();
    const sets: string[] = [];
    const vals: Array<string | null> = [];
    if (updates.summaryPrompt !== undefined) {
      sets.push('summary_prompt = ?');
      vals.push(updates.summaryPrompt ?? null);
    }
    if (updates.reactionEmojis !== undefined) {
      sets.push('reaction_emojis = ?');
      vals.push(updates.reactionEmojis ? JSON.stringify(updates.reactionEmojis) : null);
    }
    if (sets.length > 0) {
      vals.push(teamId);
      db.prepare(`UPDATE teams SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    return this.getSettings(teamId);
  },

  /**
   * Hard-delete a team. CASCADE wipes all the team's rooms (and their
   * cards/votes/participants via existing room cascades). Returns true
   * when a row was actually removed.
   */
  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

/**
 * Decode a stored reaction_emojis cell into a string[] or null. Null when
 * absent, malformed, not an array, or empty after filtering to non-empty
 * strings (so an empty/garbage value falls back to defaults at the caller).
 */
function parseReactionEmojis(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const emojis = parsed.filter((e): e is string => typeof e === 'string' && e.length > 0);
    return emojis.length > 0 ? emojis : null;
  } catch {
    return null;
  }
}
