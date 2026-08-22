import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 7777),
  dbPath: process.env.DB_PATH ?? path.join(packageRoot, 'data', 'presight.db'),
  clientDist: process.env.CLIENT_DIST ?? path.join(packageRoot, '..', 'client', 'dist'),
  seedUserCount: Number(process.env.SEED_USER_COUNT ?? 10_000),
  defaultPageSize: 50,
  maxPageSize: 100,
  maxFilterValues: 50,
  facetLimit: 20,
} as const;
