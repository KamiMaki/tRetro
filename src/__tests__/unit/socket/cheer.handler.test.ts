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

import { registerCheerHandlers } from '@/lib/socket/handlers/cheer.handler';
import {
  CHEER_EFFECT_VALUES,
  CHEER_RATE_MAX,
  CHEER_RATE_WINDOW_MS,
  COMBO_COOLDOWN_MS,
  COMBO_WINDOW_MS,
} from '@/lib/socket/handlers/limits';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';

interface Broadcast {
  room: string;
  event: string;
  payload: unknown;
}

function makeHarness(data: SocketData, now?: () => number) {
  const handlers = new Map<string, (payload: unknown) => void>();
  const emitted: { event: string; payload: unknown }[] = [];
  const broadcasts: Broadcast[] = [];
  const socket = {
    data,
    on: (event: string, cb: (payload: unknown) => void) => {
      handlers.set(event, cb);
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  };
  // Cheers fan out with a plain io.to(room).emit — capture both arms.
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        broadcasts.push({ room, event, payload });
      },
    }),
  };
  registerCheerHandlers(io as unknown as Server, socket as unknown as Socket, now);
  return { handlers, emitted, broadcasts };
}

describe('cheer.handler', () => {
  let roomId: string;
  let participantId: string;
  let cardId: string;

  beforeEach(() => {
    const room = roomRepo.create('Cheer Room');
    roomId = room.id;
    participantId = participantRepo.create(roomId, 'Alice').id;
    cardId = cardRepo.create(roomId, 'went-well', 'a card', participantId, []).id;
  });

  function harness(now?: () => number) {
    return makeHarness(
      { roomId, participantId, isScrumMaster: false, nickname: 'Alice', teamId: 't' } as SocketData,
      now,
    );
  }

  it('broadcasts CHEER_BURST carrying only the card, effect and heat — never attribution', () => {
    const { handlers, broadcasts, emitted } = harness();
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'confetti' });

    expect(emitted).toHaveLength(0);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0].room).toBe(roomId);
    expect(broadcasts[0].event).toBe(SOCKET_EVENTS.CHEER_BURST);
    expect(broadcasts[0].payload).toEqual({ cardId, effect: 'confetti', cardCheerTotal: 1 });
    // Not even a null `nickname` key: a cheer leaves no trace of who sent it,
    // in anonymous and named rooms alike. `cardCheerTotal` is a per-card
    // count, never a per-person one.
    expect(Object.keys(broadcasts[0].payload as object).sort()).toEqual([
      'cardCheerTotal',
      'cardId',
      'effect',
    ]);
  });

  it('carries a per-card cheer running total that grows with every burst', () => {
    let clock = 7_000_000;
    const otherCard = cardRepo.create(roomId, 'went-well', 'second card', participantId, []).id;
    const { handlers, broadcasts } = harness(() => clock);

    clock += 10;
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'clap' });
    clock += 10;
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'fire' });
    clock += 10;
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId: otherCard, effect: 'clap' });

    const totals = broadcasts.map((b) => (b.payload as { cardCheerTotal: number }).cardCheerTotal);
    // Two cheers on the first card, then a fresh count for the second.
    expect(totals).toEqual([1, 2, 1]);
  });

  it('accepts every effect in the 喜怒哀樂 set', () => {
    let clock = 5_000_000;
    const { handlers, broadcasts } = harness(() => clock);

    for (const effect of CHEER_EFFECT_VALUES) {
      clock += 10;
      handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect });
    }

    expect(broadcasts.map((b) => (b.payload as { effect: string }).effect)).toEqual([
      ...CHEER_EFFECT_VALUES,
    ]);
  });

  it('drops an unknown effect name without broadcasting', () => {
    const { handlers, broadcasts, emitted } = harness();
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'nuke' });
    // 'cheer' was a v1 effect and no longer exists — it must be rejected too.
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'cheer' });
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 123 });
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!(undefined);

    expect(broadcasts).toHaveLength(0);
    expect(emitted).toHaveLength(0);
  });

  it('drops a cardId that belongs to another room', () => {
    const otherRoom = roomRepo.create('Other Room');
    const otherAuthor = participantRepo.create(otherRoom.id, 'Mallory').id;
    const foreignCard = cardRepo.create(otherRoom.id, 'went-well', 'not yours', otherAuthor, []).id;

    const { handlers, broadcasts } = harness();
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId: foreignCard, effect: 'fire' });
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId: 'no-such-card', effect: 'fire' });
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId: '', effect: 'fire' });

    expect(broadcasts).toHaveLength(0);
  });

  it(`broadcasts ${CHEER_RATE_MAX} cheers in the window and silently drops the next`, () => {
    let clock = 1_000_000;
    const { handlers, broadcasts, emitted } = harness(() => clock);

    for (let i = 0; i < CHEER_RATE_MAX + 1; i++) {
      clock += 10;
      handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'love' });
    }

    expect(broadcasts).toHaveLength(CHEER_RATE_MAX);
    // Silent drop — no error event back to the sender.
    expect(emitted).toHaveLength(0);
  });

  it('lets the window slide — cheering works again after the window elapses', () => {
    let clock = 2_000_000;
    const { handlers, broadcasts } = harness(() => clock);

    for (let i = 0; i < CHEER_RATE_MAX + 2; i++) {
      handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'mindblown' });
    }
    expect(broadcasts).toHaveLength(CHEER_RATE_MAX);

    clock += CHEER_RATE_WINDOW_MS + 1;
    handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'mindblown' });

    expect(broadcasts).toHaveLength(CHEER_RATE_MAX + 1);
  });

  describe('combo', () => {
    let bobId: string;

    beforeEach(() => {
      bobId = participantRepo.create(roomId, 'Bob').id;
    });

    function harnessFor(pid: string, now: () => number) {
      return makeHarness(
        { roomId, participantId: pid, isScrumMaster: false, nickname: pid, teamId: 't' } as SocketData,
        now,
      );
    }

    const combosIn = (bs: Broadcast[]) => bs.filter((b) => b.event === SOCKET_EVENTS.CHEER_COMBO);

    it('fires on the third cheer once a second participant has joined in', () => {
      let clock = 10_000_000;
      const alice = harnessFor(participantId, () => clock);
      const bob = harnessFor(bobId, () => clock);

      clock += 100;
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'fire' });
      clock += 100;
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'fire' });
      expect(combosIn(alice.broadcasts)).toHaveLength(0);

      clock += 100;
      bob.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'fire' });

      const combos = combosIn(bob.broadcasts);
      expect(combos).toHaveLength(1);
      expect(combos[0].room).toBe(roomId);
      expect(combos[0].payload).toEqual({ effect: 'fire', count: 3 });
    });

    it('never fires for one participant cheering alone, however hard they mash', () => {
      let clock = 11_000_000;
      const alice = harnessFor(participantId, () => clock);

      for (let i = 0; i < 5; i++) {
        clock += 100;
        alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'love' });
      }

      expect(alice.broadcasts).toHaveLength(5);
      expect(combosIn(alice.broadcasts)).toHaveLength(0);
    });

    it('lets the window expire — stale cheers stop counting toward a combo', () => {
      let clock = 12_000_000;
      const alice = harnessFor(participantId, () => clock);
      const bob = harnessFor(bobId, () => clock);

      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'clap' });
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'clap' });
      clock += COMBO_WINDOW_MS + 1;
      bob.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'clap' });

      expect(combosIn(bob.broadcasts)).toHaveLength(0);
    });

    it('holds a cooldown so one enthusiastic room cannot chain combos', () => {
      let clock = 13_000_000;
      const alice = harnessFor(participantId, () => clock);
      const bob = harnessFor(bobId, () => clock);

      const rally = () => {
        clock += 100;
        alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'laugh' });
        clock += 100;
        alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'laugh' });
        clock += 100;
        bob.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'laugh' });
      };

      rally();
      expect(combosIn(bob.broadcasts)).toHaveLength(1);

      // Still inside the cooldown: the room cheers just as hard, nothing fires.
      clock += 1_000;
      rally();
      expect(combosIn(bob.broadcasts)).toHaveLength(1);

      // Past the cooldown: a fresh rally combos again.
      clock += COMBO_COOLDOWN_MS + 1;
      rally();
      expect(combosIn(bob.broadcasts)).toHaveLength(2);
    });

    it('counts each effect separately — three different emoji are not a combo', () => {
      let clock = 14_000_000;
      const alice = harnessFor(participantId, () => clock);
      const bob = harnessFor(bobId, () => clock);

      clock += 100;
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'clap' });
      clock += 100;
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'fire' });
      clock += 100;
      bob.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'clap' });

      expect(combosIn(alice.broadcasts)).toHaveLength(0);
      expect(combosIn(bob.broadcasts)).toHaveLength(0);
    });

    it('counts a room-wide rally even when the cheers land on different cards', () => {
      const second = cardRepo.create(roomId, 'went-well', 'another', participantId, []).id;
      let clock = 15_000_000;
      const alice = harnessFor(participantId, () => clock);
      const bob = harnessFor(bobId, () => clock);

      clock += 100;
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId, effect: 'mindblown' });
      clock += 100;
      alice.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId: second, effect: 'mindblown' });
      clock += 100;
      bob.handlers.get(SOCKET_EVENTS.CHEER_SEND)!({ cardId: second, effect: 'mindblown' });

      expect(combosIn(bob.broadcasts)).toHaveLength(1);
    });
  });
});
