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

// Imports after the mock so each route handler resolves the in-memory DB.
import { GET as listRooms, POST as createRoom } from '@/app/api/rooms/route';
import { GET as getRoom, DELETE as deleteRoom } from '@/app/api/rooms/[roomId]/route';
import { GET as exportRoom } from '@/app/api/rooms/[roomId]/export/route';
import { GET as roomHistory } from '@/app/api/rooms/[roomId]/history/route';
import { POST as joinRoom } from '@/app/api/rooms/[roomId]/participants/route';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { roomRepo } from '@/lib/db/repositories/room.repo';
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
  const serialized =
    body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(url, { method, headers, body: serialized });
}

async function makeRoomFor(teamId: string, name = 'room-' + teamId.slice(0, 4)) {
  return roomRepo.create(name, 'classic', teamId);
}

const params = (roomId: string) => ({ params: Promise.resolve({ roomId }) });

describe('GET /api/rooms — team scoping', () => {
  it('returns 403 when no team cookie', async () => {
    const res = await listRooms(jsonRequest('http://localhost/api/rooms'));
    expect(res.status).toBe(403);
  });

  it('returns only rooms owned by the requesting team', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    await makeRoomFor(a.id, 'a-room');
    await makeRoomFor(b.id, 'b-room');
    // Legacy unclaimed room
    roomRepo.create('legacy', 'classic', null);

    const res = await listRooms(jsonRequest('http://localhost/api/rooms', { cookie: `${TEAM_COOKIE_NAME}=${a.id}` }));
    expect(res.status).toBe(200);
    const rooms = await res.json();
    expect(rooms.map((r: { name: string }) => r.name)).toEqual(['a-room']);
  });
});

describe('POST /api/rooms — team scoping + per-room settings', () => {
  it('returns 403 without team cookie', async () => {
    const res = await createRoom(jsonRequest('http://localhost/api/rooms', { method: 'POST', body: { name: 'X' } }));
    expect(res.status).toBe(403);
  });

  it('creates a room owned by the requesting team with optional settings', async () => {
    const team = await teamRepo.create('TeamA', 'pw1234');
    const res = await createRoom(
      jsonRequest('http://localhost/api/rooms', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { name: 'New retro', participantCount: 6, isAnonymous: false },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const room = roomRepo.findById(body.roomId)!;
    expect(room.teamId).toBe(team.id);
    expect(room.participantCount).toBe(6);
    expect(room.isAnonymous).toBe(false);
  });

  it('accepts anonymous=true without a participantCount', async () => {
    const team = await teamRepo.create('TeamA', 'pw1234');
    const noCount = await createRoom(
      jsonRequest('http://localhost/api/rooms', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { name: 'Anon', isAnonymous: true },
      }),
    );
    expect(noCount.status).toBe(201);
    const noCountBody = await noCount.json();
    const noCountRoom = roomRepo.findById(noCountBody.roomId)!;
    expect(noCountRoom.isAnonymous).toBe(true);
    expect(noCountRoom.participantCount).toBeNull();

    const zeroCount = await createRoom(
      jsonRequest('http://localhost/api/rooms', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { name: 'Anon', isAnonymous: true, participantCount: 0 },
      }),
    );
    expect(zeroCount.status).toBe(201);
    const zeroCountBody = await zeroCount.json();
    const zeroCountRoom = roomRepo.findById(zeroCountBody.roomId)!;
    expect(zeroCountRoom.isAnonymous).toBe(true);
    expect(zeroCountRoom.participantCount).toBeNull();
  });

  it('accepts anonymous=true with positive participantCount', async () => {
    const team = await teamRepo.create('TeamA', 'pw1234');
    const res = await createRoom(
      jsonRequest('http://localhost/api/rooms', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${team.id}`,
        body: { name: 'Anon ok', isAnonymous: true, participantCount: 8 },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const room = roomRepo.findById(body.roomId)!;
    expect(room.isAnonymous).toBe(true);
    expect(room.participantCount).toBe(8);
  });
});

describe('GET /api/rooms/:id — cross-team rejection', () => {
  it('403 when room belongs to another team', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await getRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id, { cookie: `${TEAM_COOKIE_NAME}=${b.id}` }),
      params(roomA.id),
    );
    expect(res.status).toBe(403);
  });

  it('200 when room belongs to the requesting team', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await getRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id, { cookie: `${TEAM_COOKIE_NAME}=${a.id}` }),
      params(roomA.id),
    );
    expect(res.status).toBe(200);
  });

  it('200 when room is unclaimed (legacy access allowed for any team)', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const legacy = roomRepo.create('legacy', 'classic', null);
    const res = await getRoom(
      jsonRequest('http://localhost/api/rooms/' + legacy.id, { cookie: `${TEAM_COOKIE_NAME}=${a.id}` }),
      params(legacy.id),
    );
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/rooms/:id — team scoping', () => {
  it('403 when deleting another team\'s room', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await deleteRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id, { method: 'DELETE', cookie: `${TEAM_COOKIE_NAME}=${b.id}` }),
      params(roomA.id),
    );
    expect(res.status).toBe(403);
    expect(roomRepo.findById(roomA.id)).not.toBeNull();
  });

  it('deletes when room belongs to requesting team', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await deleteRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id, { method: 'DELETE', cookie: `${TEAM_COOKIE_NAME}=${a.id}` }),
      params(roomA.id),
    );
    expect(res.status).toBe(200);
    expect(roomRepo.findById(roomA.id)).toBeNull();
  });

  it('deletes unclaimed rooms for any logged-in user (existing pre-team behavior)', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const legacy = roomRepo.create('legacy', 'classic', null);
    const res = await deleteRoom(
      jsonRequest('http://localhost/api/rooms/' + legacy.id, { method: 'DELETE', cookie: `${TEAM_COOKIE_NAME}=${a.id}` }),
      params(legacy.id),
    );
    expect(res.status).toBe(200);
    expect(roomRepo.findById(legacy.id)).toBeNull();
  });
});

describe('GET /api/rooms/:id/export — cross-team rejection', () => {
  it('403 when exporting another team\'s room', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await exportRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id + '/export?format=md', { cookie: `${TEAM_COOKIE_NAME}=${b.id}` }),
      params(roomA.id),
    );
    expect(res.status).toBe(403);
  });
});

describe('GET /api/rooms/:id/history — cross-team rejection', () => {
  it('403 when reading another team\'s history', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await roomHistory(
      jsonRequest('http://localhost/api/rooms/' + roomA.id + '/history', { cookie: `${TEAM_COOKIE_NAME}=${b.id}` }),
      params(roomA.id),
    );
    expect(res.status).toBe(403);
  });
});

describe('POST /api/rooms/:id/participants — team + unclaimed gating', () => {
  it('403 when joining another team\'s room', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await joinRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id + '/participants', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${b.id}`,
        body: { nickname: 'guest' },
      }),
      params(roomA.id),
    );
    expect(res.status).toBe(403);
  });

  it('409 when joining an unclaimed room', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const legacy = roomRepo.create('legacy', 'classic', null);
    const res = await joinRoom(
      jsonRequest('http://localhost/api/rooms/' + legacy.id + '/participants', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${a.id}`,
        body: { nickname: 'guest' },
      }),
      params(legacy.id),
    );
    expect(res.status).toBe(409);
  });

  it('joins successfully when team matches', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const roomA = await makeRoomFor(a.id);
    const res = await joinRoom(
      jsonRequest('http://localhost/api/rooms/' + roomA.id + '/participants', {
        method: 'POST',
        cookie: `${TEAM_COOKIE_NAME}=${a.id}`,
        body: { nickname: 'guest' },
      }),
      params(roomA.id),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sessionToken).toBeDefined();
    expect(body.nickname).toBe('guest');
  });
});
