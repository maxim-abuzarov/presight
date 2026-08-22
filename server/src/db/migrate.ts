import { config } from '../config.js';
import { getDb } from './connection.js';
import { SCHEMA_SQL } from './schema.js';

export function migrate(): void {
  if (config.dbReadOnly) return;
  getDb().exec(SCHEMA_SQL);
}

export function runMigrate(): void {
  migrate();
  console.log('Schema applied.');
}
