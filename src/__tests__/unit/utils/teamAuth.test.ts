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

// Import after mock is set up so teamAuth resolves the mocked connection.
import {
  TEAM_COOKIE_NAME,
  getTeamIdFromRequest,
  requireTeamId,
} from '@/lib/utils/teamAuth';
import { teamRepo } from '@/lib/db/repositories/team.repo';

function reqWithCookie(cookie: string | null): Request {
  const headers: Record<string, string> = {};
  if (cookie !== null) headers['cookie'] = cookie;
  return new Request('http://localhost/api/whatever', { headers });
}

describe('teamAuth', () => {
  describe('getTeamIdFromRequest', () => {
    it('returns null when no cookie header', () => {
      expect(getTeamIdFromRequest(reqWithCookie(null))).toBeNull();
    });

    it('returns null when tretro-team cookie absent among others', () => {
      expect(getTeamIdFromRequest(reqWithCookie('foo=bar; baz=qux'))).toBeNull();
    });

    it('extracts the tretro-team value alone', () => {
      expect(getTeamIdFromRequest(reqWithCookie('tretro-team=team-abc'))).toBe('team-abc');
    });

    it('extracts the tretro-team value among other cookies', () => {
      const got = getTeamIdFromRequest(reqWithCookie('foo=1; tretro-team=t-123; bar=2'));
      expect(got).toBe('t-123');
    });

    it('decodes percent-encoded values', () => {
      const got = getTeamIdFromRequest(reqWithCookie('tretro-team=abc%2Bdef'));
      expect(got).toBe('abc+def');
    });

    it('returns null for empty value', () => {
      expect(getTeamIdFromRequest(reqWithCookie('tretro-team='))).toBeNull();
    });
  });

  describe('requireTeamId', () => {
    it('returns 403 error response when cookie missing', async () => {
      const result = requireTeamId(reqWithCookie(null));
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.status).toBe(403);
        const body = await result.error.json();
        expect(body).toEqual({ error: 'No team selected' });
      }
    });

    it('returns 403 + cleared cookie when team no longer exists', async () => {
      const result = requireTeamId(reqWithCookie(`${TEAM_COOKIE_NAME}=ghost-team`));
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.status).toBe(403);
        const body = await result.error.json();
        expect(body).toEqual({ error: 'Team not found' });
        // The Set-Cookie header should clear the stale cookie
        const setCookie = result.error.headers.get('set-cookie') ?? '';
        expect(setCookie).toContain(`${TEAM_COOKIE_NAME}=`);
        // Either Max-Age=0 or Expires in the past indicates deletion
        expect(setCookie.toLowerCase()).toMatch(/(max-age=0|expires=)/);
      }
    });

    it('returns { teamId } when cookie points to existing team', async () => {
      const team = await teamRepo.create('alpha', 'pw1234');
      const result = requireTeamId(reqWithCookie(`${TEAM_COOKIE_NAME}=${team.id}`));
      expect('teamId' in result).toBe(true);
      if ('teamId' in result) {
        expect(result.teamId).toBe(team.id);
      }
    });
  });
});
