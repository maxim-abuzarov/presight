import { getDb } from './connection.js';
import { SCHEMA_SQL } from './schema.js';

export function migrate(): void {
  getDb().exec(SCHEMA_SQL);
}

export function runMigrate(): void {
  migrate();
  console.log('Schema applied.');
}
