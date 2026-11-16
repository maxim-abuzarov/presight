import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { config } from '../config.js';

export type SqlParam = string | number;

/**
 * One connection per process, opened lazily.
 *
 * node:sqlite is synchronous: a query runs to completion on the main thread before any other
 * JavaScript does. With a ~3MB database and indexed queries that finish in single-digit
 * milliseconds this is simpler and faster than a pool — there is no connection to check out,
 * and two queries issued back-to-back inside one request (the count and the page) cannot have
 * another request's work interleaved between them. The trade-off is that a slow query blocks
 * the event loop, which is why every filter path is indexed and pageSize is capped.
 */
let instance: DatabaseSync | undefined;
let overridePath: string | undefined;

/** Points the module at another database (tests use ':memory:'). */
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
  // SQLite ships with foreign keys OFF for backwards compatibility; constraints are useless
  // unless they are switched on for every connection.
  db.exec('PRAGMA foreign_keys = ON');
  // If another process (a seed run) holds the write lock, wait up to 5s instead of failing
  // immediately with SQLITE_BUSY.
  db.exec('PRAGMA busy_timeout = 5000');
  if (!readOnly) {
    // WAL lets readers keep reading while a writer writes; NORMAL sync is the documented safe
    // pairing for WAL (durable across app crashes, may lose the last commit on power loss).
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

/** Runs `work` in one transaction: all of its writes land, or none do. */
export function transaction<T>(work: () => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
