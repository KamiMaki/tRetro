import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';
import type { Server, Socket } from 'socket.io';
import type { SocketData } from '@/lib/socket/middleware';

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

import { registerFocusHandlers } from '@/lib/socket/handlers/focus.handler';
import { getFocusState, clearFocusState } from '@/lib/socket/focus-store';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';

interface Broadcast {
  room: string;
  event: string;
  payload: unknown;
}

// Every participant in this app is a Scrum Master (participant.repo.ts) — so
// presenting is claimed, not granted. The harness gives each socket its own id
// so the disconnect path can tell two sockets of one participant apart.
function makeHarness(data: SocketData, socketId: string) {
  const handlers = new Map<string, (payload: unknown) => void>();
  const emitted: { event: string; payload: unknown }[] = [];
  const broadcasts: Broadcast[] = [];
  const socket = {
    id: socketId,
    data,
    on: (event: string, cb: (payload: unknown) => void) => {
      handlers.set(event, cb);
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  };
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        broadcasts.push({ room, event, payload });
      },
    }),
  };
  registerFocusHandlers(io as unknown as Server, socket as unknown as Socket);
  return { handlers, emitted, broadcasts };
}

describe('focus.handler (presenter claim)', () => {
  let roomId: string;
  let aliceId: string;
  let bobId: string;
  let cardId: string;
  let secondCardId: string;

  beforeEach(() => {
    const room = roomRepo.create('Focus Room');
    roomId = room.id;
    aliceId = participantRepo.create(roomId, 'Alice').id;
    bobId = participantRepo.create(roomId, 'Bob').id;
    cardId = cardRepo.create(roomId, 'went-well', 'a card', aliceId, []).id;
    secondCardId = cardRepo.create(roomId, 'went-well', 'another card', aliceId, []).id;
  });

  afterEach(() => {
    clearFocusState(roomId);
  });

  function harness(participantId: string, socketId: string) {
    return makeHarness(
      { roomId, participantId, isScrumMaster: true, nickname: participantId, teamId: 't' } as SocketData,
      socketId,
    );
  }

  it('lets any participant claim the room — everyone here is a Scrum Master', () => {
    const alice = harness(aliceId, 'sock-a');
    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });

    expect(alice.emitted).toHaveLength(0);
    expect(alice.broadcasts).toHaveLength(1);
    expect(alice.broadcasts[0].room).toBe(roomId);
    expect(alice.broadcasts[0].event).toBe(SOCKET_EVENTS.FOCUS_UPDATED);
    expect(alice.broadcasts[0].payload).toEqual({ presenterId: aliceId, cardId });
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId });
  });

  it('claims with no card yet — the presenter publishes their position next', () => {
    const alice = harness(aliceId, 'sock-a');
    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!(undefined);

    expect(alice.broadcasts[0].payload).toEqual({ presenterId: aliceId, cardId: null });
  });

  it('moves the room only for the current presenter — others are dropped in silence', () => {
    const alice = harness(aliceId, 'sock-a');
    const bob = harness(bobId, 'sock-b');

    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });
    bob.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId: secondCardId });

    // Bob is not presenting: no broadcast, no error toast, no store change.
    expect(bob.broadcasts).toHaveLength(0);
    expect(bob.emitted).toHaveLength(0);
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId });

    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId: secondCardId });
    expect(alice.broadcasts).toHaveLength(2);
    expect(alice.broadcasts[1].payload).toEqual({ presenterId: aliceId, cardId: secondCardId });
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId: secondCardId });
  });

  it('drops FOCUS_SET entirely while nobody is presenting', () => {
    const alice = harness(aliceId, 'sock-a');
    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId });

    expect(alice.broadcasts).toHaveLength(0);
    expect(getFocusState(roomId)).toBeNull();
  });

  it('hands over on the next claim — last claim wins', () => {
    const alice = harness(aliceId, 'sock-a');
    const bob = harness(bobId, 'sock-b');

    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });
    bob.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId: secondCardId });

    expect(bob.broadcasts[0].payload).toEqual({ presenterId: bobId, cardId: secondCardId });
    expect(getFocusState(roomId)).toEqual({ presenterId: bobId, cardId: secondCardId });

    // Alice has lost the room: her navigation no longer moves anyone.
    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId });
    expect(getFocusState(roomId)).toEqual({ presenterId: bobId, cardId: secondCardId });
  });

  it('keeps the room on the same card when a takeover names no card', () => {
    const alice = harness(aliceId, 'sock-a');
    const bob = harness(bobId, 'sock-b');

    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });
    bob.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!(undefined);

    // Followers should not be yanked to nowhere just because the wheel changed hands.
    expect(getFocusState(roomId)).toEqual({ presenterId: bobId, cardId });
  });

  it('releases only for the presenter', () => {
    const alice = harness(aliceId, 'sock-a');
    const bob = harness(bobId, 'sock-b');

    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });

    bob.handlers.get(SOCKET_EVENTS.FOCUS_RELEASE)!(undefined);
    expect(bob.broadcasts).toHaveLength(0);
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId });

    alice.handlers.get(SOCKET_EVENTS.FOCUS_RELEASE)!(undefined);
    expect(alice.broadcasts[1].payload).toEqual({ presenterId: null, cardId: null });
    expect(getFocusState(roomId)).toBeNull();
  });

  it('frees the room when the presenting socket dies', () => {
    const alice = harness(aliceId, 'sock-a');
    const bob = harness(bobId, 'sock-b');

    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });

    // A non-presenter leaving changes nothing.
    bob.handlers.get(SOCKET_EVENTS.DISCONNECT)!(undefined);
    expect(bob.broadcasts).toHaveLength(0);
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId });

    alice.handlers.get(SOCKET_EVENTS.DISCONNECT)!(undefined);
    expect(alice.broadcasts[1].event).toBe(SOCKET_EVENTS.FOCUS_UPDATED);
    expect(alice.broadcasts[1].payload).toEqual({ presenterId: null, cardId: null });
    expect(getFocusState(roomId)).toBeNull();
  });

  it('survives a presenter reload — the stale socket must not free the room', () => {
    const first = harness(aliceId, 'sock-a1');
    first.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });

    // Same participant, new tab/socket, claims again; then the old socket's
    // disconnect finally lands.
    const second = harness(aliceId, 'sock-a2');
    second.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId });
    first.handlers.get(SOCKET_EVENTS.DISCONNECT)!(undefined);

    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId });
  });

  it('rejects a cardId from another room, on claim and on set alike', () => {
    const other = roomRepo.create('Other Room');
    const otherAuthor = participantRepo.create(other.id, 'Mallory').id;
    const foreignCard = cardRepo.create(other.id, 'went-well', 'not yours', otherAuthor, []).id;

    const alice = harness(aliceId, 'sock-a');
    alice.handlers.get(SOCKET_EVENTS.FOCUS_CLAIM)!({ cardId: foreignCard });
    // The claim still stands (claiming needs no card) — but not on that card.
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId: null });

    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId: foreignCard });
    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId: 'no-such-card' });
    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!({ cardId: '' });
    alice.handlers.get(SOCKET_EVENTS.FOCUS_SET)!(undefined);

    // Only the claim broadcast; every bad card was ignored.
    expect(alice.broadcasts).toHaveLength(1);
    expect(getFocusState(roomId)).toEqual({ presenterId: aliceId, cardId: null });
  });
});
