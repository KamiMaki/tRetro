import { request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getDailyPassword } from '../../lib/utils/dailyPassword';

/**
 * Authenticate once and persist the cookie to a storageState file so every
 * test starts already past the daily-password gate.
 */
export default async function globalSetup() {
  const baseURL = 'http://localhost:3000';
  const storagePath = path.resolve('playwright/.auth/user.json');

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/auth', {
    data: { password: getDailyPassword() },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`E2E auth setup failed: ${res.status()} ${body}`);
  }
  await ctx.storageState({ path: storagePath });
  await ctx.dispose();
}
