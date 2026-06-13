import { getDb } from './connection';
import { CREATE_TABLES_SQL } from './schema';
import { generateId } from '../utils/id';
import { templateSections } from '../templates';

export function runMigrations(): void {
  const db = getDb();
  db.exec(CREATE_TABLES_SQL);

  // 2026-05-01: shared facilitation — every participant has SM powers.
  // Backfill existing rows so reconnecting users see the full toolset.
  db.exec(`UPDATE participants SET is_scrum_master = 1 WHERE is_scrum_master = 0`);

  // 2026-05-02: per-room webhook URL for action-item digest on close.
  // ALTER TABLE ADD COLUMN is idempotent only if guarded — SQLite throws
  // if the column already exists. Inspect pragma first.
  const cols = db.prepare(`PRAGMA table_info(rooms)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'webhook_url')) {
    db.exec(`ALTER TABLE rooms ADD COLUMN webhook_url TEXT`);
  }

  // 2026-05-02: retro template selection (classic / mad-sad-glad / etc.)
  if (!cols.some((c) => c.name === 'template_id')) {
    db.exec(`ALTER TABLE rooms ADD COLUMN template_id TEXT NOT NULL DEFAULT 'classic'`);
  }

  // 2026-05-02: metric scale moved from 1-100 to 1-10. Convert existing
  // submissions in place (round-half-up of score / 10, clamped to 1).
  // Anything already in [1..10] is left untouched.
  db.exec(`
    UPDATE metric_submissions
       SET score = MAX(1, CAST((score + 5) / 10 AS INTEGER)),
           updated_at = datetime('now')
     WHERE score > 10
  `);

  // 2026-05-02: tag.is_default flag — mark certain tags as room defaults
  // so new cards auto-pick them up.
  const tagCols = db.prepare(`PRAGMA table_info(tags)`).all() as Array<{ name: string }>;
  if (!tagCols.some((c) => c.name === 'is_default')) {
    db.exec(`ALTER TABLE tags ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`);
  }

  // 2026-05-02: cards.revealed_nickname — author can reveal under a custom
  // name and toggle it back to anonymous later.
  const cardCols = db.prepare(`PRAGMA table_info(cards)`).all() as Array<{ name: string }>;
  if (!cardCols.some((c) => c.name === 'revealed_nickname')) {
    db.exec(`ALTER TABLE cards ADD COLUMN revealed_nickname TEXT`);
  }

  // 2026-05-05: cards.is_parked — Scrum-Master parking lot for cards that
  // need a deeper dive than the main walk-through.
  if (!cardCols.some((c) => c.name === 'is_parked')) {
    db.exec(`ALTER TABLE cards ADD COLUMN is_parked INTEGER NOT NULL DEFAULT 0`);
  }

  // 2026-05-30: comments.image_data — optional base64 image attachment so a
  // comment can carry a pasted/attached picture alongside (or instead of) text.
  const commentCols = db.prepare(`PRAGMA table_info(comments)`).all() as Array<{ name: string }>;
  if (!commentCols.some((c) => c.name === 'image_data')) {
    db.exec(`ALTER TABLE comments ADD COLUMN image_data TEXT`);
  }

  // 2026-06-13: comments.updated_at — nullable; non-null means the comment was
  // edited at least once. null = never edited (original post).
  if (!commentCols.some((c) => c.name === 'updated_at')) {
    db.exec(`ALTER TABLE comments ADD COLUMN updated_at TEXT`);
  }

  // 2026-05-24: team-spaces multi-tenancy.
  // Re-read rooms columns after earlier ALTERs so the guard reflects
  // current schema state.
  const roomCols = db.prepare(`PRAGMA table_info(rooms)`).all() as Array<{ name: string }>;
  if (!roomCols.some((c) => c.name === 'team_id')) {
    // Nullable FK — existing rows become "unclaimed" legacy rooms.
    db.exec(`ALTER TABLE rooms ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE CASCADE`);
  }
  if (!roomCols.some((c) => c.name === 'participant_count')) {
    // Configured headcount for vote-denominator math. NULL = use session fallback.
    db.exec(`ALTER TABLE rooms ADD COLUMN participant_count INTEGER`);
  }
  if (!roomCols.some((c) => c.name === 'is_anonymous')) {
    db.exec(`ALTER TABLE rooms ADD COLUMN is_anonymous INTEGER NOT NULL DEFAULT 0`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rooms_team ON rooms(team_id)`);

  // 2026-06-13: custom sections. Drop the legacy 4-value CHECK on
  // cards.section so a room can define arbitrary sections. SQLite cannot
  // ALTER a CHECK, so rebuild the table. It is FK-safe: child rows
  // (card_tags / comments / reactions / votes / drawings) reference
  // cards.id and we preserve every id, but DROP TABLE would still trip
  // foreign_keys, so disable FK enforcement around the swap and restore it
  // after. Only rebuild when the old CHECK is actually present — fresh DBs
  // already use the constraint-free schema.
  const cardsTableSql =
    (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='cards'").get() as
      | { sql: string }
      | undefined)?.sql ?? '';
  if (/CHECK\s*\(\s*section/i.test(cardsTableSql)) {
    db.pragma('foreign_keys = OFF');
    const rebuildCards = db.transaction(() => {
      db.exec(`
        CREATE TABLE cards_rebuild (
          id                TEXT PRIMARY KEY,
          room_id           TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
          section           TEXT NOT NULL,
          content           TEXT NOT NULL,
          author_id         TEXT NOT NULL REFERENCES participants(id),
          is_revealed       INTEGER NOT NULL DEFAULT 0,
          revealed_nickname TEXT,
          is_parked         INTEGER NOT NULL DEFAULT 0,
          created_at        TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO cards_rebuild
          (id, room_id, section, content, author_id, is_revealed, revealed_nickname, is_parked, created_at, updated_at)
          SELECT id, room_id, section, content, author_id, is_revealed, revealed_nickname, is_parked, created_at, updated_at
          FROM cards;
        DROP TABLE cards;
        ALTER TABLE cards_rebuild RENAME TO cards;
        CREATE INDEX IF NOT EXISTS idx_cards_room ON cards(room_id);
        CREATE INDEX IF NOT EXISTS idx_cards_section ON cards(room_id, section);
      `);
    });
    try {
      rebuildCards();
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }

  // 2026-06-13: backfill room_sections for rooms that predate custom
  // sections — seed each from its chosen template's default layout.
  const roomsWithoutSections = db
    .prepare(
      `SELECT r.id AS id, r.template_id AS template_id
         FROM rooms r
        WHERE NOT EXISTS (SELECT 1 FROM room_sections rs WHERE rs.room_id = r.id)`,
    )
    .all() as Array<{ id: string; template_id: string | null }>;
  if (roomsWithoutSections.length > 0) {
    const insertSection = db.prepare(
      'INSERT INTO room_sections (id, room_id, section_key, label, emoji, tone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const seedAll = db.transaction((rooms: Array<{ id: string; template_id: string | null }>) => {
      for (const room of rooms) {
        for (const s of templateSections(room.template_id)) {
          insertSection.run(generateId(), room.id, s.sectionKey, s.label, s.emoji, s.tone, s.position);
        }
      }
    });
    seedAll(roomsWithoutSections);
  }
}
