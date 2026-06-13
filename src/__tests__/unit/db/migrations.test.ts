import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';

let testDb: Database.Database;

jest.mock('@/lib/db/connection', () => ({
  getDb: () => testDb,
}));

// Import after the mock so runMigrations resolves the in-memory DB.
import { runMigrations } from '@/lib/db/migrations';

/**
 * Stand up a pre-2026-06-13 database: the legacy `cards` table still carries
 * the 4-value CHECK on section. Everything else comes from the current
 * schema (its `CREATE TABLE IF NOT EXISTS cards` is a no-op against the
 * legacy table we created first).
 */
function seedLegacyDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE cards (
      id                TEXT PRIMARY KEY,
      room_id           TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      section           TEXT NOT NULL CHECK(section IN ('went-well','to-improve','thanks','deep-dive')),
      content           TEXT NOT NULL,
      author_id         TEXT NOT NULL REFERENCES participants(id),
      is_revealed       INTEGER NOT NULL DEFAULT 0,
      revealed_nickname TEXT,
      is_parked         INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(CREATE_TABLES_SQL);
  return db;
}

beforeEach(() => {
  testDb = seedLegacyDb();
  // Minimal fixture: a team, a room (template 'mad-sad-glad'), a participant,
  // two cards, a tag + card_tag, and a comment — so the rebuild has child
  // rows to preserve.
  testDb.exec(`
    INSERT INTO teams (id, name, password_hash, password_salt) VALUES ('t1', 'Alpha', 'h', 's');
    INSERT INTO rooms (id, name, template_id, team_id) VALUES ('r1', 'Retro 1', 'mad-sad-glad', 't1');
    INSERT INTO participants (id, room_id, nickname, session_token) VALUES ('p1', 'r1', 'Ann', 'tok1');
    INSERT INTO cards (id, room_id, section, content, author_id) VALUES ('c1', 'r1', 'went-well', 'Shipped it', 'p1');
    INSERT INTO cards (id, room_id, section, content, author_id) VALUES ('c2', 'r1', 'to-improve', 'Flaky tests', 'p1');
    INSERT INTO tags (id, room_id, name, color) VALUES ('tag1', 'r1', 'infra', '#84e1c8');
    INSERT INTO card_tags (card_id, tag_id) VALUES ('c1', 'tag1');
    INSERT INTO comments (id, card_id, room_id, author_id, content) VALUES ('cm1', 'c1', 'r1', 'p1', 'nice');
  `);
});

afterEach(() => {
  testDb.close();
});

describe('runMigrations — custom sections', () => {
  it('drops the section CHECK with zero data loss', () => {
    const before = testDb.prepare('SELECT id, section, content, author_id FROM cards ORDER BY id').all();

    runMigrations();

    const after = testDb.prepare('SELECT id, section, content, author_id FROM cards ORDER BY id').all();
    expect(after).toEqual(before);
    expect(after).toHaveLength(2);
  });

  it('preserves child rows (card_tags, comments) across the cards rebuild', () => {
    runMigrations();

    const tagLink = testDb.prepare('SELECT card_id, tag_id FROM card_tags').all();
    expect(tagLink).toEqual([{ card_id: 'c1', tag_id: 'tag1' }]);

    const comments = testDb.prepare('SELECT id, card_id, content FROM comments').all();
    expect(comments).toEqual([{ id: 'cm1', card_id: 'c1', content: 'nice' }]);
  });

  it('allows inserting a card with an arbitrary custom section key', () => {
    runMigrations();

    expect(() => {
      testDb
        .prepare('INSERT INTO cards (id, room_id, section, content, author_id) VALUES (?, ?, ?, ?, ?)')
        .run('c3', 'r1', 'custom-abc', 'A custom section card', 'p1');
    }).not.toThrow();

    const row = testDb.prepare('SELECT section FROM cards WHERE id = ?').get('c3') as { section: string };
    expect(row.section).toBe('custom-abc');
  });

  it('leaves foreign keys enforced after the rebuild', () => {
    runMigrations();
    const fk = testDb.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('backfills room_sections from the room template (4 rows, ordered)', () => {
    runMigrations();

    const sections = testDb
      .prepare('SELECT section_key, label, emoji, position FROM room_sections WHERE room_id = ? ORDER BY position')
      .all('r1') as Array<{ section_key: string; label: string; emoji: string; position: number }>;

    expect(sections).toHaveLength(4);
    expect(sections.map((s) => s.section_key)).toEqual(['went-well', 'to-improve', 'thanks', 'deep-dive']);
    // mad-sad-glad template labels/emojis
    expect(sections[0]).toMatchObject({ label: 'Glad', emoji: '😄', position: 0 });
    expect(sections[1]).toMatchObject({ label: 'Mad', emoji: '😡', position: 1 });
  });

  it('is idempotent — a second run neither duplicates sections nor errors', () => {
    runMigrations();
    runMigrations();

    const count = testDb.prepare('SELECT COUNT(*) AS n FROM room_sections WHERE room_id = ?').get('r1') as {
      n: number;
    };
    expect(count.n).toBe(4);
  });
});
