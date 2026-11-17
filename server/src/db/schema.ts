export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    sql: `
      CREATE TABLE IF NOT EXISTS nationalities (
        id   INTEGER PRIMARY KEY,
        name TEXT    NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS hobbies (
        id   INTEGER PRIMARY KEY,
        name TEXT    NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS users (
        id             INTEGER PRIMARY KEY,
        avatar         TEXT    NOT NULL,
        first_name     TEXT    NOT NULL CHECK (length(first_name) > 0),
        last_name      TEXT    NOT NULL CHECK (length(last_name) > 0),
        first_name_lc  TEXT    NOT NULL,
        last_name_lc   TEXT    NOT NULL,
        age            INTEGER NOT NULL CHECK (age BETWEEN 0 AND 130),
        nationality_id INTEGER NOT NULL REFERENCES nationalities(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS user_hobbies (
        user_id  INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        hobby_id INTEGER NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, hobby_id)
      ) WITHOUT ROWID;

      CREATE INDEX IF NOT EXISTS idx_users_nationality  ON users(nationality_id, id);
      CREATE INDEX IF NOT EXISTS idx_users_first_name   ON users(first_name_lc, id);
      CREATE INDEX IF NOT EXISTS idx_users_last_name    ON users(last_name_lc, id);
      CREATE INDEX IF NOT EXISTS idx_users_age          ON users(age, id);
      CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby ON user_hobbies(hobby_id, user_id);
    `,
  },
  {
    version: 2,
    name: 'serve avatars from our own origin',
    sql: `
      UPDATE users
      SET avatar = '/api/avatars/u' || id || '.svg'
      WHERE avatar LIKE 'https://api.dicebear.com/%';
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
