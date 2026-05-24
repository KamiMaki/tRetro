import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import { hashTeamPassword, verifyTeamPassword } from '../../utils/teamPassword';
import type { Team } from '../../types';

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
