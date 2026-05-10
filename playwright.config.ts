import { defineConfig } from '@playwright/test';

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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'playwright/.auth/user.json',
  },
  webServer: {
    command: 'npx tsx server.ts',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_PATH: 'data/test-e2e.db',
    },
  },
});
