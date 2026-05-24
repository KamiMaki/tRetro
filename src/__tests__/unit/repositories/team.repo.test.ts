import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';

let testDb: Database.Database;

jest.mock('@/lib/db/connection', () => ({
  getDb: () => testDb,
}));

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(CREATE_TABLES_SQL);
});

afterEach(() => {
  testDb.close();
});

import { teamRepo } from '@/lib/db/repositories/team.repo';

describe('teamRepo', () => {
  describe('create', () => {
    it('returns a team with id, name, createdAt — no password fields', async () => {
      const team = await teamRepo.create('Sprint Squad', 'pw1234');
      expect(team.id).toBeDefined();
      expect(typeof team.id).toBe('string');
      expect(team.id.length).toBeGreaterThan(0);
      expect(team.name).toBe('Sprint Squad');
      expect(team.createdAt).toBeDefined();
      expect(team).not.toHaveProperty('password_hash');
      expect(team).not.toHaveProperty('password_salt');
    });

    it('persists the scrypt hash and salt in the DB row', async () => {
      const team = await teamRepo.create('Persist Team', 'p@ss');
      const row = testDb
        .prepare('SELECT password_hash, password_salt FROM teams WHERE id = ?')
        .get(team.id) as { password_hash: string; password_salt: string };
      expect(row.password_hash).toMatch(/^[0-9a-f]{128}$/);
      expect(row.password_salt).toMatch(/^[0-9a-f]{32}$/);
      // The plaintext must never be stored
      expect(row.password_hash).not.toBe('p@ss');
    });

    it('throws on duplicate team name (UNIQUE constraint)', async () => {
      await teamRepo.create('Dup', 'first');
      await expect(teamRepo.create('Dup', 'second')).rejects.toThrow();
    });
  });

  describe('findById / findByName', () => {
    it('findById returns the team when it exists', async () => {
      const created = await teamRepo.create('Findable', 'pw');
      const found = teamRepo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Findable');
    });

    it('findById returns null for unknown id', () => {
      expect(teamRepo.findById('nope')).toBeNull();
    });

    it('findByName returns the team', async () => {
      await teamRepo.create('NameMatch', 'pw');
      const found = teamRepo.findByName('NameMatch');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('NameMatch');
    });

    it('findByName returns null for unknown name', () => {
      expect(teamRepo.findByName('ghost')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns teams ordered by name, with no password fields exposed', async () => {
      await teamRepo.create('Bravo', 'p');
      await teamRepo.create('Alpha', 'p');
      await teamRepo.create('Charlie', 'p');
      const all = teamRepo.findAll();
      expect(all.map((t) => t.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
      for (const t of all) {
        expect(t).not.toHaveProperty('password_hash');
        expect(t).not.toHaveProperty('password_salt');
      }
    });

    it('returns empty array when no teams', () => {
      expect(teamRepo.findAll()).toEqual([]);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for the correct password', async () => {
      const team = await teamRepo.create('Vault', 'opensesame');
      const ok = await teamRepo.verifyPassword(team.id, 'opensesame');
      expect(ok).toBe(true);
    });

    it('returns false for the wrong password', async () => {
      const team = await teamRepo.create('Vault', 'opensesame');
      const ok = await teamRepo.verifyPassword(team.id, 'wrong');
      expect(ok).toBe(false);
    });

    it('returns false for unknown team id (no oracle)', async () => {
      const ok = await teamRepo.verifyPassword('ghost-team-id', 'whatever');
      expect(ok).toBe(false);
    });
  });

  describe('delete', () => {
    it('returns true and removes the team when it exists', async () => {
      const team = await teamRepo.create('Doomed', 'p');
      expect(teamRepo.delete(team.id)).toBe(true);
      expect(teamRepo.findById(team.id)).toBeNull();
    });

    it('returns false for unknown id (idempotent)', () => {
      expect(teamRepo.delete('never-existed')).toBe(false);
    });

    it('cascades to rooms via team_id FK', async () => {
      const team = await teamRepo.create('CascadeTeam', 'p');
      // Insert a room belonging to this team
      testDb
        .prepare('INSERT INTO rooms (id, name, team_id) VALUES (?, ?, ?)')
        .run('r1', 'Linked Room', team.id);
      const before = testDb.prepare('SELECT COUNT(*) as n FROM rooms WHERE id = ?').get('r1') as { n: number };
      expect(before.n).toBe(1);

      teamRepo.delete(team.id);

      const after = testDb.prepare('SELECT COUNT(*) as n FROM rooms WHERE id = ?').get('r1') as { n: number };
      expect(after.n).toBe(0);
    });
  });
});
