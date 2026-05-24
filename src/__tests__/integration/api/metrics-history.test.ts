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

import { GET as metricsHistory } from '@/app/api/metrics/history/route';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { metricRepo } from '@/lib/db/repositories/metric.repo';
import { TEAM_COOKIE_NAME } from '@/lib/utils/teamAuth';

function req(url: string, cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return new Request(url, { headers });
}

interface HistoryEntry {
  roomId: string;
  roomName: string;
}

describe('GET /api/metrics/history — team scoping', () => {
  it('403 without team cookie', async () => {
    const res = await metricsHistory(req('http://localhost/api/metrics/history'));
    expect(res.status).toBe(403);
  });

  it('returns only rooms owned by the requesting team', async () => {
    const teamA = await teamRepo.create('A', 'pw1234');
    const teamB = await teamRepo.create('B', 'pw1234');
    const roomA = roomRepo.create('A-room', 'classic', teamA.id);
    const roomB = roomRepo.create('B-room', 'classic', teamB.id);
    const pA = participantRepo.create(roomA.id, 'GuestA');
    const pB = participantRepo.create(roomB.id, 'GuestB');
    metricRepo.submit(roomA.id, pA.id, { speed: 8 });
    metricRepo.submit(roomB.id, pB.id, { speed: 3 });

    const resA = await metricsHistory(req('http://localhost/api/metrics/history', `${TEAM_COOKIE_NAME}=${teamA.id}`));
    expect(resA.status).toBe(200);
    const bodyA = await resA.json();
    const namesA = (bodyA.history as HistoryEntry[]).map((h) => h.roomName);
    expect(namesA).toEqual(['A-room']);

    const resB = await metricsHistory(req('http://localhost/api/metrics/history', `${TEAM_COOKIE_NAME}=${teamB.id}`));
    const bodyB = await resB.json();
    const namesB = (bodyB.history as HistoryEntry[]).map((h) => h.roomName);
    expect(namesB).toEqual(['B-room']);
  });

  it('does not surface unclaimed (team_id IS NULL) rooms', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    const ownRoom = roomRepo.create('own', 'classic', team.id);
    const legacyRoom = roomRepo.create('legacy', 'classic', null);
    const p1 = participantRepo.create(ownRoom.id, 'G1');
    const p2 = participantRepo.create(legacyRoom.id, 'G2');
    metricRepo.submit(ownRoom.id, p1.id, { speed: 5 });
    metricRepo.submit(legacyRoom.id, p2.id, { speed: 9 });

    const res = await metricsHistory(req('http://localhost/api/metrics/history', `${TEAM_COOKIE_NAME}=${team.id}`));
    const body = await res.json();
    const names = (body.history as HistoryEntry[]).map((h) => h.roomName);
    expect(names).toEqual(['own']);
  });

  it('respects the limit query param', async () => {
    const team = await teamRepo.create('A', 'pw1234');
    for (let i = 0; i < 5; i++) {
      const r = roomRepo.create('r' + i, 'classic', team.id);
      const p = participantRepo.create(r.id, 'g');
      metricRepo.submit(r.id, p.id, { speed: i + 1 });
    }
    const res = await metricsHistory(req('http://localhost/api/metrics/history?limit=2', `${TEAM_COOKIE_NAME}=${team.id}`));
    const body = await res.json();
    expect(body.history).toHaveLength(2);
  });
});
