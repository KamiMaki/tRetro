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

// Imported after mock so route handlers resolve the in-memory DB.
import { GET as listTeams, POST as createTeam } from '@/app/api/teams/route';
import { POST as authTeam, DELETE as logoutTeam } from '@/app/api/teams/auth/route';
import { GET as currentTeam } from '@/app/api/teams/me/route';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { TEAM_COOKIE_NAME } from '@/lib/utils/teamAuth';
import { teamAuthLimiter } from '@/lib/utils/rateLimit';

interface JsonInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function jsonRequest(url: string, init: JsonInit = {}): Request {
  const { body, headers, method } = init;
  const serialized =
    body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
    body: serialized,
  });
}

function reqWithCookie(cookie: string): Request {
  return new Request('http://localhost/api/teams/me', { headers: { cookie } });
}

function extractCookieValue(setCookie: string | null, name: string): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${name}=([^;]*)`));
  return match ? match[1] : null;
}

beforeEach(() => {
  teamAuthLimiter.__resetForTests();
});

describe('POST /api/teams', () => {
  it('creates a team and returns 201 with id/name/createdAt', async () => {
    const res = await createTeam(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { name: 'Alpha', password: 'pw1234' },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Alpha');
    expect(body.createdAt).toBeDefined();
    expect(body.password_hash).toBeUndefined();
    expect(body.password_salt).toBeUndefined();
  });

  it('rejects missing name with 400', async () => {
    const res = await createTeam(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { password: 'pw1234' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects empty/whitespace name with 400', async () => {
    const res = await createTeam(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { name: '   ', password: 'pw1234' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects too-short password with 400', async () => {
    const res = await createTeam(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { name: 'Alpha', password: 'pw' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate name', async () => {
    await teamRepo.create('Dup', 'first1234');
    const res = await createTeam(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { name: 'Dup', password: 'second1234' },
      }),
    );
    expect(res.status).toBe(409);
  });

  it('rejects too-long name with 400', async () => {
    const res = await createTeam(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { name: 'x'.repeat(41), password: 'pw1234' },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/teams', () => {
  it('returns names + ids only — never password fields', async () => {
    await teamRepo.create('Alpha', 'pw1234');
    await teamRepo.create('Bravo', 'pw1234');
    const res = await listTeams();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    for (const t of body) {
      expect(t.password_hash).toBeUndefined();
      expect(t.password_salt).toBeUndefined();
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
    }
  });
});

describe('POST /api/teams/auth', () => {
  it('sets tretro-team cookie on success', async () => {
    const team = await teamRepo.create('Vault', 'opensesame');
    const res = await authTeam(
      jsonRequest('http://localhost/api/teams/auth', {
        method: 'POST',
        body: { teamId: team.id, password: 'opensesame' },
      }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(extractCookieValue(setCookie, TEAM_COOKIE_NAME)).toBe(team.id);
  });

  it('returns 401 on wrong password without setting cookie', async () => {
    const team = await teamRepo.create('Vault', 'opensesame');
    const res = await authTeam(
      jsonRequest('http://localhost/api/teams/auth', {
        method: 'POST',
        body: { teamId: team.id, password: 'wrong' },
      }),
    );
    expect(res.status).toBe(401);
    const setCookie = res.headers.get('set-cookie');
    // Either no cookie header or the team cookie is not set
    if (setCookie) {
      expect(setCookie).not.toMatch(new RegExp(`${TEAM_COOKIE_NAME}=[^;]+`));
    }
  });

  it('returns 404 for unknown teamId', async () => {
    const res = await authTeam(
      jsonRequest('http://localhost/api/teams/auth', {
        method: 'POST',
        body: { teamId: 'ghost-team', password: 'whatever' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('rate-limits after 5 failed attempts within 60s', async () => {
    const team = await teamRepo.create('Vault', 'opensesame');
    // 5 wrong-password attempts from the same IP
    for (let i = 0; i < 5; i++) {
      const res = await authTeam(
        jsonRequest('http://localhost/api/teams/auth', {
          method: 'POST',
          headers: { 'x-forwarded-for': '203.0.113.99' },
          body: { teamId: team.id, password: 'wrong' },
        }),
      );
      expect([401, 429]).toContain(res.status);
    }
    // 6th attempt should be blocked
    const blocked = await authTeam(
      jsonRequest('http://localhost/api/teams/auth', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.99' },
        body: { teamId: team.id, password: 'opensesame' },
      }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeDefined();
  });
});

describe('DELETE /api/teams/auth', () => {
  it('clears the tretro-team cookie', async () => {
    const res = await logoutTeam();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toMatch(new RegExp(`${TEAM_COOKIE_NAME}=`));
    expect(setCookie?.toLowerCase()).toMatch(/(max-age=0|expires=)/);
  });
});

describe('GET /api/teams/me', () => {
  it('returns 403 when no cookie present', async () => {
    const res = await currentTeam(reqWithCookie(''));
    expect(res.status).toBe(403);
  });

  it('returns 403 + cleared cookie when team has been deleted', async () => {
    const res = await currentTeam(reqWithCookie(`${TEAM_COOKIE_NAME}=ghost-team`));
    expect(res.status).toBe(403);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toMatch(new RegExp(`${TEAM_COOKIE_NAME}=`));
    expect(setCookie?.toLowerCase()).toMatch(/(max-age=0|expires=)/);
  });

  it('returns team metadata when cookie is valid', async () => {
    const team = await teamRepo.create('Findable', 'pw1234');
    const res = await currentTeam(reqWithCookie(`${TEAM_COOKIE_NAME}=${team.id}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(team.id);
    expect(body.name).toBe('Findable');
    expect(body.password_hash).toBeUndefined();
    expect(body.password_salt).toBeUndefined();
  });
});
