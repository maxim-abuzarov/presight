import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Environment is the only external input the process trusts at boot, so it is validated once,
 * here, and the process refuses to start on a bad value. A typo such as PORT=77o7 fails loudly
 * with the variable's name instead of surfacing later as `listen NaN`.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65_535).default(7777),
  // Unset means Node's default: every interface, IPv4 and IPv6 (so `localhost` works either way).
  HOST: z.string().min(1).optional(),
  DB_PATH: z
    .string()
    .min(1)
    .default(path.join(packageRoot, 'data', 'presight.db')),
  DB_READONLY: z
    .enum(['0', '1', 'true', 'false'])
    .default('0')
    .transform((value) => value === '1' || value === 'true'),
  CLIENT_DIST: z
    .string()
    .min(1)
    .default(path.join(packageRoot, '..', 'client', 'dist')),
  SEED_USER_COUNT: z.coerce.number().int().min(1).max(1_000_000).default(10_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(0).default(10_000),
  // How many reverse proxies sit in front of the app. 0 (default) means clients connect
  // directly and X-Forwarded-For is ignored, so nobody can spoof their IP past the rate limiter.
  // Behind one proxy (Vercel, nginx, a load balancer) set 1.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  // Requests per minute per client IP to the data endpoints. 0 disables the limiter.
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(600),
});

function loadEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // The logger is configured from this very object, so it cannot be used yet.
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}

const env = loadEnv();

const defaultLogLevel = (): NonNullable<typeof env.LOG_LEVEL> => {
  if (env.NODE_ENV === 'test') return 'silent';
  if (env.NODE_ENV === 'production') return 'info';
  return 'debug';
};

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  host: env.HOST,
  dbPath: env.DB_PATH,
  dbReadOnly: env.DB_READONLY,
  clientDist: env.CLIENT_DIST,
  seedUserCount: env.SEED_USER_COUNT,
  logLevel: env.LOG_LEVEL ?? defaultLogLevel(),
  shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  trustProxy: env.TRUST_PROXY,
  rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
} as const;
