import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';

let testDb: Database.Database;

jest.mock('@/lib/db/connection', () => ({
  getDb: () => testDb,
}));

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(CREATE_TABLES_SQL);
});

afterEach(() => {
  testDb.close();
});

// Imported after the mock so the route handlers resolve the in-memory DB.
import { GET as getSettings, PUT as putSettings } from '@/app/api/teams/settings/route';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { teamSectionRepo } from '@/lib/db/repositories/team-section.repo';
import { TEAM_COOKIE_NAME } from '@/lib/utils/teamAuth';

interface JsonInit {
  method?: string;
  cookie?: string;
  body?: unknown;
}

function jsonRequest(url: string, init: JsonInit = {}): Request {
  const { body, cookie, method } = init;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const serialized = body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(url, { method, headers, body: serialized });
}

const URL = 'http://localhost/api/teams/settings';

describe('GET /api/teams/settings', () => {
  it('returns 403 without a team cookie', async () => {
    const res = await getSettings(jsonRequest(URL));
    expect(res.status).toBe(403);
  });

  it('seeds team_sections from the classic template on first read', async () => {
    const team = await teamRepo.create('Seeded', 'pw12345678');
    // No team_sections yet.
    expect(teamSectionRepo.findByTeamId(team.id)).toHaveLength(0);

    const res = await getSettings(jsonRequest(URL, { cookie: `${TEAM_COOKIE_NAME}=${team.id}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Defaults: prompt + palette unset (null), sections seeded with 4 rows.
    expect(body.summaryPrompt).toBeNull();
    expect(body.reactionEmojis).toBeNull();
    expect(Array.isArray(body.sections)).toBe(true);
    expect(body.sections.length).toBeGreaterThan(0);
    // The seed is now persisted, so a second call is idempotent (same count).
    expect(teamSectionRepo.findByTeamId(team.id).length).toBe(body.sections.length);
  });
});

describe('PUT /api/teams/settings', () => {
  it('returns 403 without a team cookie', async () => {
    const res = await putSettings(jsonRequest(URL, { method: 'PUT', body: { summaryPrompt: 'x' } }));
    expect(res.status).toBe(403);
  });

  it('updates summaryPrompt and reactionEmojis', async () => {
    const team = await teamRepo.create('Updater', 'pw12345678');
    const res = await putSettings(
      jsonRequest(URL, {
        method: 'PUT',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { summaryPrompt: '自訂提示', reactionEmojis: ['🔥', '🎯'] },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summaryPrompt).toBe('自訂提示');
    expect(body.reactionEmojis).toEqual(['🔥', '🎯']);

    // Persisted in the repo.
    const stored = teamRepo.getSettings(team.id)!;
    expect(stored.summaryPrompt).toBe('自訂提示');
    expect(stored.reactionEmojis).toEqual(['🔥', '🎯']);
  });

  it('clears summaryPrompt / reactionEmojis to null', async () => {
    const team = await teamRepo.create('Resetter', 'pw12345678');
    teamRepo.updateSettings(team.id, { summaryPrompt: 'old', reactionEmojis: ['😀'] });

    const res = await putSettings(
      jsonRequest(URL, {
        method: 'PUT',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { summaryPrompt: null, reactionEmojis: null },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summaryPrompt).toBeNull();
    expect(body.reactionEmojis).toBeNull();
  });

  it('replaces team_sections transactionally when sections provided', async () => {
    const team = await teamRepo.create('Sectioner', 'pw12345678');
    // Seed defaults first.
    teamSectionRepo.seedFromTemplate(team.id, 'classic');

    const res = await putSettings(
      jsonRequest(URL, {
        method: 'PUT',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: {
          sections: [
            { label: 'Alpha', emoji: '🅰️', tone: 'mint', position: 0 },
            { label: 'Beta', emoji: '🅱️', tone: 'pink', position: 1 },
          ],
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sections.map((s: { label: string }) => s.label)).toEqual(['Alpha', 'Beta']);
    expect(body.sections[0].tone).toBe('mint');
    expect(body.sections[1].tone).toBe('pink');
    // New rows get generated section keys.
    expect(body.sections[0].sectionKey).toMatch(/^custom-/);

    // Repo reflects the full replacement (old 4 rows gone).
    const stored = teamSectionRepo.findByTeamId(team.id);
    expect(stored).toHaveLength(2);
  });

  it('rejects an invalid section tone with 400', async () => {
    const team = await teamRepo.create('BadTone', 'pw12345678');
    const res = await putSettings(
      jsonRequest(URL, {
        method: 'PUT',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { sections: [{ label: 'X', emoji: '🗒️', tone: 'rainbow', position: 0 }] },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a section with an empty label with 400', async () => {
    const team = await teamRepo.create('NoLabel', 'pw12345678');
    const res = await putSettings(
      jsonRequest(URL, {
        method: 'PUT',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { sections: [{ label: '   ', emoji: '🗒️', tone: 'mint', position: 0 }] },
      }),
    );
    expect(res.status).toBe(400);
  });
});
