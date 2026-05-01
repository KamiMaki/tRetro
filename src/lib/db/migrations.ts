import { getDb } from './connection';
import { CREATE_TABLES_SQL } from './schema';

export function runMigrations(): void {
  const db = getDb();
  db.exec(CREATE_TABLES_SQL);

  // 2026-05-01: shared facilitation — every participant has SM powers.
  // Backfill existing rows so reconnecting users see the full toolset.
  db.exec(`UPDATE participants SET is_scrum_master = 1 WHERE is_scrum_master = 0`);
}
