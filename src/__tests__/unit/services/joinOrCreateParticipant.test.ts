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

import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { joinOrCreateParticipant } from '@/lib/services/joinOrCreateParticipant';

describe('joinOrCreateParticipant', () => {
  let roomId: string;

  beforeEach(() => {
    roomId = roomRepo.create('Test Room').id;
  });

  it('creates a fresh participant when no token is supplied', () => {
    const r = joinOrCreateParticipant(roomId, 'Alice');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reused).toBe(false);
    expect(r.participant.nickname).toBe('Alice');
    expect(r.participant.sessionToken).toBeDefined();
  });

  it('reuses the same participant when a valid token for the room is supplied', () => {
    const orig = participantRepo.create(roomId, 'Bob');
    const r = joinOrCreateParticipant(roomId, 'IgnoredNickname', orig.sessionToken);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reused).toBe(true);
    expect(r.participant.id).toBe(orig.id);
    // Nickname is not silently rewritten on rejoin — the participant keeps
    // the name they originally joined with.
    expect(r.participant.nickname).toBe('Bob');
  });

  it('falls back to create when the supplied token is unknown (e.g. DB wiped)', () => {
    const r = joinOrCreateParticipant(
      roomId,
      'Carol',
      '00000000-0000-0000-0000-deadbeefcafe',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reused).toBe(false);
    expect(r.participant.nickname).toBe('Carol');
    expect(r.participant.sessionToken).not.toBe('00000000-0000-0000-0000-deadbeefcafe');
  });

  it('falls back to create when the token belongs to a different room', () => {
    const other = roomRepo.create('Other Room');
    const otherToken = participantRepo.create(other.id, 'Dan').sessionToken;

    const r = joinOrCreateParticipant(roomId, 'Eve', otherToken);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reused).toBe(false);
    expect(r.participant.nickname).toBe('Eve');
    expect(r.participant.roomId).toBe(roomId);
  });

  it('returns 404 when the room does not exist', () => {
    const r = joinOrCreateParticipant('unknown-room-id', 'Anyone');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(404);
  });

  it('returns 410 when the room is closed', () => {
    roomRepo.close(roomId);
    const r = joinOrCreateParticipant(roomId, 'Anyone');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(410);
  });

  it('requires a nickname when no reuse token is supplied', () => {
    const r = joinOrCreateParticipant(roomId, '   ');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
  });

  it('does not require a nickname when the reuse path succeeds', () => {
    const orig = participantRepo.create(roomId, 'Frank');
    const r = joinOrCreateParticipant(roomId, undefined, orig.sessionToken);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reused).toBe(true);
    expect(r.participant.id).toBe(orig.id);
  });
});
