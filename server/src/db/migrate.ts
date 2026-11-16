import { config } from '../config.js';
import { logger } from '../shared/logger.js';
import { getDb } from './connection.js';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './schema.js';

export function schemaVersion(): number {
  const row = getDb().prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

/**
 * Applies every migration newer than the database's user_version, each in its own transaction.
 * Idempotent: on an up-to-date database it does nothing. A read-only database cannot be
 * migrated, so it is only checked — and a stale one is a startup error, not a runtime surprise.
 */
export function migrate(): void {
  const db = getDb();
  const current = schemaVersion();

  if (config.dbReadOnly) {
    if (current < LATEST_SCHEMA_VERSION && current !== 0) {
      throw new Error(
        `Read-only database is at schema v${current}, the app needs v${LATEST_SCHEMA_VERSION}. Rebuild it.`,
      );
    }
    return;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      // PRAGMA cannot take a bound parameter; the value is an integer literal from this file.
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec('COMMIT');
      logger.info({ version: migration.version, migration: migration.name }, 'Applied migration');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function runMigrate(): void {
  migrate();
  logger.info({ version: schemaVersion() }, 'Schema is up to date');
}
