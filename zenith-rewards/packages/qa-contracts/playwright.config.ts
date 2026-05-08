import { defineConfig, devices } from '@playwright/test';

/**
 * Live E2E against Docker Compose (or local) stack — no route mocking.
 * Prereqs: web :5173, api :8000, worker-api :8001, DB seeded (demo@zenith.test).
 *
 *   cd zenith-rewards && docker compose up -d
 *   docker compose exec api alembic upgrade head && docker compose exec api python scripts/seed.py
 *
 *   cd packages/qa-contracts && npx playwright test
 */
const baseURL = process.env.APP_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    ...devices['Desktop Chrome'],
  },
  globalSetup: require.resolve('./tests/e2e/setup/global-setup.ts'),
  projects: [{ name: 'chromium', use: {} }],
});
