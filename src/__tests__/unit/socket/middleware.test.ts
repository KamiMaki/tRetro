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

import { authMiddleware, type SocketData } from '@/lib/socket/middleware';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { TEAM_COOKIE_NAME } from '@/lib/utils/teamAuth';

interface FakeSocket {
  handshake: {
    auth: { sessionToken?: string; roomId?: string };
    headers: { cookie?: string };
  };
  data: SocketData | Record<string, unknown>;
}

function fakeSocket(opts: {
  sessionToken?: string;
  roomId?: string;
  cookie?: string;
}): FakeSocket {
  return {
    handshake: {
      auth: { sessionToken: opts.sessionToken, roomId: opts.roomId },
      headers: opts.cookie ? { cookie: opts.cookie } : {},
    },
    data: {},
  };
}

function runMiddleware(socket: FakeSocket): Promise<Error | null> {
  return new Promise((resolve) => {
    authMiddleware(socket as unknown as Parameters<typeof authMiddleware>[0], (err) => {
      resolve(err ?? null);
    });
  });
}

describe('socket authMiddleware — team verification', () => {
  it('rejects when sessionToken or roomId is missing', async () => {
    const err = await runMiddleware(fakeSocket({ cookie: `${TEAM_COOKIE_NAME}=any` }));
    expect(err?.message).toMatch(/Missing sessionToken or roomId/);
  });

  it('rejects when the participant row is unknown', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const room = roomRepo.create('r', 'classic', team.id);
    const err = await runMiddleware(
      fakeSocket({ sessionToken: 'unknown', roomId: room.id, cookie: `${TEAM_COOKIE_NAME}=${team.id}` }),
    );
    expect(err?.message).toMatch(/Invalid session token/);
  });

  it('rejects when participant belongs to a different room', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const r1 = roomRepo.create('r1', 'classic', team.id);
    const r2 = roomRepo.create('r2', 'classic', team.id);
    const p = participantRepo.create(r1.id, 'Guest');
    const err = await runMiddleware(
      fakeSocket({ sessionToken: p.sessionToken, roomId: r2.id, cookie: `${TEAM_COOKIE_NAME}=${team.id}` }),
    );
    expect(err?.message).toMatch(/Participant does not belong to this room/);
  });

  it('rejects when no team cookie is present', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const room = roomRepo.create('r', 'classic', team.id);
    const p = participantRepo.create(room.id, 'Guest');
    const err = await runMiddleware(
      fakeSocket({ sessionToken: p.sessionToken, roomId: room.id }),
    );
    expect(err?.message).toMatch(/No team selected/);
  });

  it('rejects when the room is unclaimed (team_id IS NULL)', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const room = roomRepo.create('legacy', 'classic', null);
    const p = participantRepo.create(room.id, 'Guest');
    const err = await runMiddleware(
      fakeSocket({ sessionToken: p.sessionToken, roomId: room.id, cookie: `${TEAM_COOKIE_NAME}=${team.id}` }),
    );
    expect(err?.message).toMatch(/unclaimed/);
  });

  it('rejects when the room belongs to a different team', async () => {
    const a = await teamRepo.create('A', 'pw1234');
    const b = await teamRepo.create('B', 'pw1234');
    const roomA = roomRepo.create('a-room', 'classic', a.id);
    const p = participantRepo.create(roomA.id, 'Guest');
    const err = await runMiddleware(
      fakeSocket({ sessionToken: p.sessionToken, roomId: roomA.id, cookie: `${TEAM_COOKIE_NAME}=${b.id}` }),
    );
    expect(err?.message).toMatch(/different team/);
  });

  it('passes and populates socket.data when everything matches', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const room = roomRepo.create('r', 'classic', team.id);
    const p = participantRepo.create(room.id, 'Guest');
    const socket = fakeSocket({ sessionToken: p.sessionToken, roomId: room.id, cookie: `${TEAM_COOKIE_NAME}=${team.id}` });
    const err = await runMiddleware(socket);
    expect(err).toBeNull();
    expect(socket.data).toEqual({
      participantId: p.id,
      roomId: room.id,
      isScrumMaster: true, // backfilled to all participants per migration
      nickname: 'Guest',
      teamId: team.id,
    });
  });
});
