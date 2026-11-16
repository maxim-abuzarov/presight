import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 7788);
const DB_PATH = 'e2e/.data/e2e.db';

/**
 * End-to-end tests run a real browser against the production build: Express serving the built
 * client and the API from one origin, exactly as the Docker image does. They need `npm run build`
 * first (the test:e2e script does it). The database is a separate file seeded fresh for each run,
 * so the tests never touch the development data.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node server/dist/index.js seed && node server/dist/index.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_PATH,
      SEED_USER_COUNT: '2000',
      LOG_LEVEL: 'warn',
    },
  },
});
