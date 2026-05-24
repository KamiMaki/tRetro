import { request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getDailyPassword } from '../../lib/utils/dailyPassword';

const E2E_TEAM_NAME = 'e2e-team';
const E2E_TEAM_PASS = 'e2e-test-pass';

interface TeamSummary {
  id: string;
  name: string;
}

/**
 * Authenticate Ring 1 (daily password) AND Ring 2 (team cookie), then
 * persist BOTH cookies to a storageState file so every E2E test starts
 * already past both gates.
 *
 * Idempotent: the test team is created once on first run and reused on
 * subsequent runs. The `data/test-e2e.db` SQLite file is shared, so the
 * team row survives between invocations.
 */
export default async function globalSetup() {
  const baseURL = 'http://localhost:3000';
  const storagePath = path.resolve('playwright/.auth/user.json');

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  const ctx = await request.newContext({ baseURL });

  // Ring 1: daily password.
  const dailyAuthRes = await ctx.post('/api/auth', {
    data: { password: getDailyPassword() },
  });
  if (!dailyAuthRes.ok()) {
    const body = await dailyAuthRes.text();
    throw new Error(`E2E Ring-1 auth setup failed: ${dailyAuthRes.status()} ${body}`);
  }

  // Ring 2: ensure the test team exists, then sign in to it.
  const teamsRes = await ctx.get('/api/teams');
  if (!teamsRes.ok()) {
    throw new Error(`E2E /api/teams GET failed: ${teamsRes.status()}`);
  }
  const teams = (await teamsRes.json()) as TeamSummary[];
  let team = teams.find((t) => t.name === E2E_TEAM_NAME);
  if (!team) {
    const createRes = await ctx.post('/api/teams', {
      data: { name: E2E_TEAM_NAME, password: E2E_TEAM_PASS },
    });
    if (!createRes.ok()) {
      const body = await createRes.text();
      throw new Error(`E2E team create failed: ${createRes.status()} ${body}`);
    }
    team = (await createRes.json()) as TeamSummary;
  }
  const teamAuthRes = await ctx.post('/api/teams/auth', {
    data: { teamId: team.id, password: E2E_TEAM_PASS },
  });
  if (!teamAuthRes.ok()) {
    const body = await teamAuthRes.text();
    throw new Error(`E2E Ring-2 auth setup failed: ${teamAuthRes.status()} ${body}`);
  }

  await ctx.storageState({ path: storagePath });
  await ctx.dispose();
}
