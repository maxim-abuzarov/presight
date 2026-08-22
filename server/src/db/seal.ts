import fs from 'node:fs';

import { config } from '../config.js';
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
  console.log(`Sealed ${config.dbPath} for read-only use (${(bytes / 1e6).toFixed(1)}MB).`);
}
