import { getDb } from './connection';
import { CREATE_TABLES_SQL } from './schema';

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
}
