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

import { registerCardHandlers } from '@/lib/socket/handlers/card.handler';
import { MAX_CONTENT_CHARS } from '@/lib/socket/handlers/limits';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';
import { roomSectionRepo } from '@/lib/db/repositories/room-section.repo';

interface EmittedEvent {
  event: string;
  payload: unknown;
}

function makeHarness(data: SocketData) {
  const handlers = new Map<string, (payload: unknown) => void>();
  const emitted: EmittedEvent[] = [];
  const socket = {
    data,
    on: (event: string, cb: (payload: unknown) => void) => {
      handlers.set(event, cb);
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  };
  // Broadcast lookups return undefined so handlers short-circuit before any
  // per-socket emit — we only care about the rejection path and DB writes here.
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: {
      adapter: { rooms: { get: () => undefined } },
      sockets: { get: () => undefined },
    },
  };
  registerCardHandlers(io as unknown as Server, socket as unknown as Socket);
  return { handlers, emitted };
}

describe('card.handler content-length guard', () => {
  let roomId: string;
  let participantId: string;

  beforeEach(() => {
    const room = roomRepo.create('Card Handler Room');
    roomId = room.id;
    participantId = participantRepo.create(roomId, 'Tester').id;
  });

  function harness() {
    return makeHarness({ roomId, participantId, isScrumMaster: true, nickname: 'Tester', teamId: 't' } as SocketData);
  }

  describe('CARD_CREATE', () => {
    it('rejects content longer than MAX_CONTENT_CHARS without writing a row', () => {
      const { handlers, emitted } = harness();
      handlers.get(SOCKET_EVENTS.CARD_CREATE)!({
        roomId,
        section: 'went-well',
        content: 'x'.repeat(MAX_CONTENT_CHARS + 1),
        tagIds: [],
      });

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
      expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
      expect(cardRepo.findByRoomId(roomId)).toHaveLength(0);
    });

    it('accepts content exactly at MAX_CONTENT_CHARS', () => {
      const { handlers, emitted } = harness();
      handlers.get(SOCKET_EVENTS.CARD_CREATE)!({
        roomId,
        section: 'went-well',
        content: 'x'.repeat(MAX_CONTENT_CHARS),
        tagIds: [],
      });

      expect(emitted).toHaveLength(0);
      const cards = cardRepo.findByRoomId(roomId);
      expect(cards).toHaveLength(1);
      expect(cards[0].content.length).toBe(MAX_CONTENT_CHARS);
    });
  });

  describe('CARD_UPDATE', () => {
    it('rejects oversize content and leaves the stored content unchanged', () => {
      const card = cardRepo.create(roomId, 'went-well', 'original', participantId, []);
      const { handlers, emitted } = harness();
      handlers.get(SOCKET_EVENTS.CARD_UPDATE)!({
        cardId: card.id,
        content: 'x'.repeat(MAX_CONTENT_CHARS + 1),
      });

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
      expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
      expect(cardRepo.findById(card.id)!.content).toBe('original');
    });

    it('accepts content within the limit', () => {
      const card = cardRepo.create(roomId, 'went-well', 'original', participantId, []);
      const { handlers, emitted } = harness();
      handlers.get(SOCKET_EVENTS.CARD_UPDATE)!({
        cardId: card.id,
        content: 'updated content',
      });

      expect(emitted).toHaveLength(0);
      expect(cardRepo.findById(card.id)!.content).toBe('updated content');
    });
  });
});

/**
 * Custom sections: CARD_MOVE / CARD_CREATE must validate `section` against the
 * room's actual room_sections (the legacy 4-key CHECK was dropped — see
 * migrations.ts 2026-06-13), not a hardcoded list. A team-owned room is seeded
 * from the classic template, then we add a custom section and exercise both the
 * accept and reject paths.
 */
describe('card.handler section validation against room_sections', () => {
  let roomId: string;
  let participantId: string;
  let customKey: string;

  beforeEach(() => {
    // roomRepo.create seeds room_sections from the classic template
    // (went-well / to-improve / thanks / deep-dive).
    const room = roomRepo.create('Section Validation Room', 'classic', null);
    roomId = room.id;
    participantId = participantRepo.create(roomId, 'Tester').id;
    // A freshly-created custom column, exactly like the live section editor adds.
    customKey = 'custom-ab12cd34';
    roomSectionRepo.create(roomId, customKey, 'Parking Lot', '🅿️', 'violet');
  });

  function harness() {
    return makeHarness({ roomId, participantId, isScrumMaster: true, nickname: 'Tester', teamId: 't' } as SocketData);
  }

  describe('CARD_MOVE', () => {
    it('moves a card into a freshly-created custom section and reassigns it', () => {
      const card = cardRepo.create(roomId, 'went-well', 'movable', participantId, []);
      const { handlers, emitted } = harness();

      handlers.get(SOCKET_EVENTS.CARD_MOVE)!({ cardId: card.id, section: customKey });

      expect(emitted).toHaveLength(0);
      expect(cardRepo.findById(card.id)!.section).toBe(customKey);
    });

    it('rejects a move into a non-existent section without writing', () => {
      const card = cardRepo.create(roomId, 'went-well', 'stay put', participantId, []);
      const { handlers, emitted } = harness();

      handlers.get(SOCKET_EVENTS.CARD_MOVE)!({ cardId: card.id, section: 'custom-does-not-exist' });

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
      expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
      expect(cardRepo.findById(card.id)!.section).toBe('went-well');
    });
  });

  describe('CARD_CREATE', () => {
    it('creates a card under a freshly-created custom section', () => {
      const { handlers, emitted } = harness();

      handlers.get(SOCKET_EVENTS.CARD_CREATE)!({
        roomId,
        section: customKey,
        content: 'into custom',
        tagIds: [],
      });

      expect(emitted).toHaveLength(0);
      const cards = cardRepo.findByRoomId(roomId);
      expect(cards).toHaveLength(1);
      expect(cards[0].section).toBe(customKey);
    });

    it('rejects a create into a non-existent section without writing', () => {
      const { handlers, emitted } = harness();

      handlers.get(SOCKET_EVENTS.CARD_CREATE)!({
        roomId,
        section: 'custom-does-not-exist',
        content: 'orphan card',
        tagIds: [],
      });

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
      expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
      expect(cardRepo.findByRoomId(roomId)).toHaveLength(0);
    });
  });
});
