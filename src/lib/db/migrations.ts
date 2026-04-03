import { getDb } from './connection';
import { CREATE_TABLES_SQL } from './schema';

export function runMigrations(): void {
  const db = getDb();
  db.exec(CREATE_TABLES_SQL);
}
