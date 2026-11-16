import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { closeDb, getDb, useDatabase } from './connection.js';
import { migrate, schemaVersion } from './migrate.js';
import { LATEST_SCHEMA_VERSION } from './schema.js';

beforeEach(() => useDatabase(':memory:'));
afterEach(() => closeDb());

describe('migrations', () => {
  it('brings an empty database to the latest version', () => {
    assert.equal(schemaVersion(), 0);
    migrate();
    assert.equal(schemaVersion(), LATEST_SCHEMA_VERSION);
  });

  it('is idempotent: running twice changes nothing', () => {
    migrate();
    migrate();
    assert.equal(schemaVersion(), LATEST_SCHEMA_VERSION);
  });

  it('upgrades a database created before versioning existed', () => {
    getDb().exec(`
      CREATE TABLE nationalities (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
      CREATE TABLE users (id INTEGER PRIMARY KEY, avatar TEXT NOT NULL, first_name TEXT NOT NULL,
        last_name TEXT NOT NULL, first_name_lc TEXT NOT NULL, last_name_lc TEXT NOT NULL,
        age INTEGER NOT NULL, nationality_id INTEGER NOT NULL REFERENCES nationalities(id));
    `);
    migrate();
    assert.equal(schemaVersion(), LATEST_SCHEMA_VERSION);
  });
});

describe('migration 2: avatars served from our own origin', () => {
  it('rewrites third-party avatar URLs and leaves local ones alone', () => {
    const db = getDb();
    db.exec(`
      CREATE TABLE nationalities (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
      CREATE TABLE users (id INTEGER PRIMARY KEY, avatar TEXT NOT NULL, first_name TEXT NOT NULL,
        last_name TEXT NOT NULL, first_name_lc TEXT NOT NULL, last_name_lc TEXT NOT NULL,
        age INTEGER NOT NULL, nationality_id INTEGER NOT NULL REFERENCES nationalities(id));
      INSERT INTO nationalities VALUES (1, 'France');
      INSERT INTO users VALUES
        (7, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=x', 'A', 'B', 'a', 'b', 30, 1),
        (8, '/api/avatars/u8.svg', 'C', 'D', 'c', 'd', 40, 1);
    `);
    migrate();
    const avatars = db.prepare('SELECT id, avatar FROM users ORDER BY id').all();
    assert.deepEqual(
      avatars.map((row) => ({ ...row })),
      [
        { id: 7, avatar: '/api/avatars/u7.svg' },
        { id: 8, avatar: '/api/avatars/u8.svg' },
      ],
    );
  });
});

describe('constraints', () => {
  const insertUser = (age: number, nationalityId: number) =>
    getDb()
      .prepare(
        `INSERT INTO users (avatar, first_name, last_name, first_name_lc, last_name_lc, age, nationality_id)
         VALUES ('a', 'Ann', 'Lee', 'ann', 'lee', ?, ?)`,
      )
      .run(age, nationalityId);

  beforeEach(() => {
    migrate();
    getDb().exec(`INSERT INTO nationalities (id, name) VALUES (1, 'France')`);
  });

  it('accepts a valid row', () => {
    assert.doesNotThrow(() => insertUser(30, 1));
  });

  it('rejects an impossible age at the database level', () => {
    assert.throws(() => insertUser(200, 1), /CHECK constraint failed/);
  });

  it('rejects a user pointing at a nationality that does not exist', () => {
    assert.throws(() => insertUser(30, 999), /FOREIGN KEY constraint failed/);
  });

  it('refuses to delete a nationality that users still reference', () => {
    insertUser(30, 1);
    assert.throws(() => getDb().exec('DELETE FROM nationalities WHERE id = 1'), /FOREIGN KEY/);
  });

  it('removes a user’s hobby links when the user is deleted', () => {
    const { lastInsertRowid } = insertUser(30, 1);
    getDb().exec(`INSERT INTO hobbies (id, name) VALUES (1, 'Chess')`);
    getDb()
      .prepare('INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, 1)')
      .run(lastInsertRowid);
    getDb().prepare('DELETE FROM users WHERE id = ?').run(lastInsertRowid);
    const { links } = getDb().prepare('SELECT COUNT(*) AS links FROM user_hobbies').get() as {
      links: number;
    };
    assert.equal(links, 0);
  });
});

describe('runSeedIfEmpty', () => {
  it('seeds an empty database and leaves a seeded one untouched', async () => {
    const { runSeedIfEmpty } = await import('./seed.js');
    const { config } = await import('../config.js');
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-if-empty-'));
    const file = path.join(dir, 'test.db');
    const users = () => {
      useDatabase(file);
      const { n } = getDb().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
      return n;
    };

    useDatabase(file);
    runSeedIfEmpty();
    assert.equal(users(), config.seedUserCount);

    getDb().exec('DELETE FROM user_hobbies WHERE user_id = 1; DELETE FROM users WHERE id = 1');
    runSeedIfEmpty();
    assert.equal(users(), config.seedUserCount - 1, 'existing data must not be re-seeded');
    closeDb();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
