import fs from 'node:fs';

import { config } from '../config.js';
import { logger } from '../shared/logger.js';
import { closeDb, getDb } from './connection.js';

export function runSeal(): void {
  const db = getDb();
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('VACUUM');
  closeDb();

  for (const suffix of ['-wal', '-shm']) {
    fs.rmSync(`${config.dbPath}${suffix}`, { force: true });
  }

  const bytes = fs.statSync(config.dbPath).size;
  logger.info({ dbPath: config.dbPath, bytes }, 'Sealed database for read-only use');
}
