import { request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const E2E_TEAM_NAME = 'e2e-team';
const E2E_TEAM_PASS = 'e2e-test-pass';

interface TeamSummary {
  id: string;
  name: string;
}

/**
 * Authenticate the team cookie, then persist it to a storageState file so
 * every E2E test starts already past the gate.
 *
 * Idempotent: the test team is created once on first run and reused on
 * subsequent runs. The `data/test-e2e.db` SQLite file is shared, so the
 * team row survives between invocations.
 */
export default async function globalSetup() {
  // Must match playwright.config.ts — both honour E2E_PORT.
  const baseURL = `http://localhost:${process.env.E2E_PORT ?? 3000}`;
  const storagePath = path.resolve('playwright/.auth/user.json');

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  const ctx = await request.newContext({ baseURL });

  // Ensure the test team exists, then sign in to it.
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
    throw new Error(`E2E team auth setup failed: ${teamAuthRes.status()} ${body}`);
  }

  // Persist the team cookie AND seed localStorage so the first-run
  // onboarding tour (src/components/room/OnboardingTour.tsx) never auto-opens
  // during E2E — its full-screen backdrop would otherwise intercept every
  // board interaction. The API request context can't set localStorage, so we
  // augment the storageState JSON with an origins entry by hand.
  const state = await ctx.storageState();
  state.origins = [
    ...(state.origins ?? []),
    {
      origin: baseURL,
      localStorage: [{ name: 'tretro-onboarding-seen', value: '1' }],
    },
  ];
  fs.writeFileSync(storagePath, JSON.stringify(state));
  await ctx.dispose();
}
