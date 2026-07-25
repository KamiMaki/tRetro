import { defineConfig } from '@playwright/test';

// Port is overridable so a local run can dodge whatever else is already
// bound to 3000 — `reuseExistingServer` will happily adopt a foreign app
// and every test then fails against the wrong server.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './src/__tests__/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  globalSetup: './src/__tests__/e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'playwright/.auth/user.json',
  },
  webServer: {
    command: 'npx tsx server.ts',
    port: PORT,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      PORT: String(PORT),
      DATABASE_PATH: 'data/test-e2e.db',
    },
  },
});
