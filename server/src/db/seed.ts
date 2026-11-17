import { Faker, base, de, en, es, fr, ja, pt_BR } from '@faker-js/faker';

import { config } from '../config.js';
import { logger } from '../shared/logger.js';
import { closeDb, getDb, queryOne, transaction } from './connection.js';
import { HOBBIES, NATIONALITIES, type WeightedValue } from './datasets.js';
import { migrate } from './migrate.js';

const SEED = 20260822;

const avatarUrl = (id: number): string => `/api/avatars/u${id}.svg`;

const english = new Faker({ locale: [en, base] });

const LOCALE_PACKS = { fr, de, es, pt_BR, ja } as const;

const FAKERS: Record<keyof typeof LOCALE_PACKS, Faker> = Object.fromEntries(
  Object.entries(LOCALE_PACKS).map(([key, pack]) => [key, new Faker({ locale: [pack, base, en] })]),
) as Record<keyof typeof LOCALE_PACKS, Faker>;

const LOCALE_BY_NATIONALITY: Record<string, keyof typeof LOCALE_PACKS> = {
  France: 'fr',
  Germany: 'de',
  Austria: 'de',
  Switzerland: 'de',
  Spain: 'es',
  Mexico: 'es',
  Argentina: 'es',
  Chile: 'es',
  Colombia: 'es',
  Peru: 'es',
  Brazil: 'pt_BR',
  Portugal: 'pt_BR',
  Japan: 'ja',
};

const ALL_FAKERS: Faker[] = [english, ...Object.values(FAKERS)];

function namesFor(nationality: string): Faker {
  const locale = LOCALE_BY_NATIONALITY[nationality];
  return locale ? FAKERS[locale] : english;
}

const HOBBY_COUNT_WEIGHTS = [4, 8, 14, 16, 15, 13, 10, 8, 6, 4, 2];

function weightedIndexPicker(weights: number[]): (roll: number) => number {
  const cumulative: number[] = [];
  let total = 0;
  for (const weight of weights) {
    total += weight;
    cumulative.push(total);
  }
  return (roll) => {
    const target = roll * total;
    for (let i = 0; i < cumulative.length; i += 1) {
      if (target < cumulative[i]!) return i;
    }
    return cumulative.length - 1;
  };
}

const weightsOf = (values: WeightedValue[]): number[] => values.map((value) => value.weight);

function resetSchema(): void {
  const db = getDb();
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`
    DROP TABLE IF EXISTS user_hobbies;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS hobbies;
    DROP TABLE IF EXISTS nationalities;
    PRAGMA user_version = 0;
  `);
  db.exec('PRAGMA foreign_keys = ON');
  migrate();
}

const normalizeName = (value: string): string => value.normalize('NFC');

export function seed(userCount = config.seedUserCount): void {
  resetSchema();
  const db = getDb();

  for (const faker of ALL_FAKERS) faker.seed(SEED);
  const rng = english;

  transaction(() => {
    const insertNationality = db.prepare('INSERT INTO nationalities (name) VALUES (?)');
    const insertHobby = db.prepare('INSERT INTO hobbies (name) VALUES (?)');
    const nationalityIds = new Map<string, number>();
    const hobbyIds = new Map<string, number>();

    for (const { name } of NATIONALITIES) {
      nationalityIds.set(name, Number(insertNationality.run(name).lastInsertRowid));
    }
    for (const { name } of HOBBIES) {
      hobbyIds.set(name, Number(insertHobby.run(name).lastInsertRowid));
    }

    const insertUser = db.prepare(
      `INSERT INTO users (id, avatar, first_name, last_name, first_name_lc, last_name_lc, age, nationality_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertUserHobby = db.prepare(
      'INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)',
    );

    const pickNationality = weightedIndexPicker(weightsOf(NATIONALITIES));
    const pickHobby = weightedIndexPicker(weightsOf(HOBBIES));
    const pickHobbyCount = weightedIndexPicker(HOBBY_COUNT_WEIGHTS);
    const roll = (): number => rng.number.float({ min: 0, max: 1 });

    for (let id = 1; id <= userCount; id += 1) {
      const nationality = NATIONALITIES[pickNationality(roll())]!.name;
      const names = namesFor(nationality);
      const firstName = normalizeName(names.person.firstName());
      const lastName = normalizeName(names.person.lastName());

      insertUser.run(
        id,
        avatarUrl(id),
        firstName,
        lastName,
        firstName.toLowerCase(),
        lastName.toLowerCase(),
        rng.number.int({ min: 18, max: 72 }),
        nationalityIds.get(nationality)!,
      );

      const hobbyCount = id === 1 ? 0 : id === 2 ? 10 : pickHobbyCount(roll());

      const chosen = new Set<string>();

      for (let attempt = 0; chosen.size < hobbyCount && attempt < hobbyCount * 20; attempt += 1) {
        chosen.add(HOBBIES[pickHobby(roll())]!.name);
      }
      for (const hobby of chosen) {
        insertUserHobby.run(id, hobbyIds.get(hobby)!);
      }
    }
  });

  db.exec('ANALYZE');
}

export function runSeed(): void {
  const started = Date.now();
  seed();
  const db = getDb();
  const users = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  const links = (db.prepare('SELECT COUNT(*) AS c FROM user_hobbies').get() as { c: number }).c;
  logger.info(
    { users, hobbyLinks: links, dbPath: config.dbPath, durationMs: Date.now() - started },
    'Seeded database',
  );
  closeDb();
}

function existingUserCount(): number {
  const table = queryOne<{ name: string } | undefined>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
  );
  if (!table) return 0;
  return queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM users').count;
}

export function runSeedIfEmpty(): void {
  const count = existingUserCount();
  if (count === 0) {
    runSeed();
    return;
  }
  migrate();
  logger.info({ users: count }, 'Database already seeded; skipping');
  closeDb();
}
