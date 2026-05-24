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

import { POST as claimRoom } from '@/app/api/rooms/[roomId]/claim/route';
import { GET as listUnclaimed } from '@/app/api/rooms/unclaimed/route';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { TEAM_COOKIE_NAME } from '@/lib/utils/teamAuth';

function req(url: string, init: { method?: string; cookie?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (init.cookie) headers.cookie = init.cookie;
  return new Request(url, { method: init.method, headers });
}

const params = (roomId: string) => ({ params: Promise.resolve({ roomId }) });

describe('roomRepo.claim — atomic transition', () => {
  it('moves an unclaimed room into the team and returns true', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const room = roomRepo.create('legacy', 'classic', null);
    expect(room.teamId).toBeNull();

    const ok = roomRepo.claim(room.id, team.id);
    expect(ok).toBe(true);
    expect(roomRepo.findById(room.id)!.teamId).toBe(team.id);
  });

  it('returns false on second claim — race-safe', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const room = roomRepo.create('legacy', 'classic', null);
    expect(roomRepo.claim(room.id, a.id)).toBe(true);
    expect(roomRepo.claim(room.id, b.id)).toBe(false);
    expect(roomRepo.findById(room.id)!.teamId).toBe(a.id);
  });

  it('returns false for an unknown room id', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    expect(roomRepo.claim('does-not-exist', team.id)).toBe(false);
  });
});

describe('POST /api/rooms/:id/claim', () => {
  it('403 without team cookie', async () => {
    const room = roomRepo.create('legacy', 'classic', null);
    const res = await claimRoom(
      req(`http://localhost/api/rooms/${room.id}/claim`, { method: 'POST' }),
      params(room.id),
    );
    expect(res.status).toBe(403);
  });

  it('404 for unknown room', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const res = await claimRoom(
      req('http://localhost/api/rooms/ghost/claim', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
      }),
      params('ghost'),
    );
    expect(res.status).toBe(404);
  });

  it('200 on successful claim — room.team_id flips to teamId', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const room = roomRepo.create('legacy', 'classic', null);
    const res = await claimRoom(
      req(`http://localhost/api/rooms/${room.id}/claim`, {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
      }),
      params(room.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.room.teamId).toBe(team.id);
    expect(roomRepo.findById(room.id)!.teamId).toBe(team.id);
  });

  it('409 when the room is already claimed', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const room = roomRepo.create('legacy', 'classic', null);
    expect(roomRepo.claim(room.id, a.id)).toBe(true);

    const res = await claimRoom(
      req(`http://localhost/api/rooms/${room.id}/claim`, {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${b.id}`,
      }),
      params(room.id),
    );
    expect(res.status).toBe(409);
    // Owner unchanged
    expect(roomRepo.findById(room.id)!.teamId).toBe(a.id);
  });
});

describe('GET /api/rooms/unclaimed', () => {
  it('403 without team cookie', async () => {
    const res = await listUnclaimed(req('http://localhost/api/rooms/unclaimed'));
    expect(res.status).toBe(403);
  });

  it('returns only legacy rooms (team_id IS NULL)', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    roomRepo.create('legacy-1', 'classic', null);
    roomRepo.create('legacy-2', 'classic', null);
    roomRepo.create('owned', 'classic', team.id);

    const res = await listUnclaimed(
      req('http://localhost/api/rooms/unclaimed', { cookie: `${TEAM_COOKIE_NAME}=${team.id}` }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((r: { name: string }) => r.name).sort()).toEqual(['legacy-1', 'legacy-2']);
  });
});
