import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { config } from '../config.js';

export type SqlParam = string | number;

let instance: DatabaseSync | undefined;
let overridePath: string | undefined;

export function useDatabase(dbPath: string): void {
  closeDb();
  overridePath = dbPath;
}

export function getDb(): DatabaseSync {
  if (instance) return instance;

  const target = overridePath ?? config.dbPath;
  const readOnly = config.dbReadOnly && target === config.dbPath;

  if (target !== ':memory:' && !readOnly) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }

  const db = new DatabaseSync(target, { readOnly });
  db.exec('PRAGMA foreign_keys = ON');
  if (!readOnly) {
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');
  }

  instance = db;
  return db;
}

export function closeDb(): void {
  instance?.close();
  instance = undefined;
}

export function queryAll<T>(sql: string, params: SqlParam[] = []): T[] {
  return getDb()
    .prepare(sql)
    .all(...params) as unknown as T[];
}

export function queryOne<T>(sql: string, params: SqlParam[] = []): T {
  return getDb()
    .prepare(sql)
    .get(...params) as unknown as T;
}
