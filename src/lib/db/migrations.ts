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
}
