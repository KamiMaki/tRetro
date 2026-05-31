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

import { registerCommentHandlers } from '@/lib/socket/handlers/comment.handler';
import { MAX_CONTENT_CHARS } from '@/lib/socket/handlers/limits';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';
import { commentRepo } from '@/lib/db/repositories/comment.repo';

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
  // Broadcast lookups return undefined so broadcastComment short-circuits
  // before any per-socket emit — the success path still writes the DB row.
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: {
      adapter: { rooms: { get: () => undefined } },
      sockets: { get: () => undefined },
    },
  };
  registerCommentHandlers(io as unknown as Server, socket as unknown as Socket);
  return { handlers, emitted };
}

describe('comment.handler content-length guard', () => {
  let roomId: string;
  let participantId: string;
  let cardId: string;

  beforeEach(() => {
    const room = roomRepo.create('Comment Handler Room');
    roomId = room.id;
    participantId = participantRepo.create(roomId, 'Tester').id;
    cardId = cardRepo.create(roomId, 'went-well', 'a card', participantId, []).id;
  });

  function harness() {
    return makeHarness({ roomId, participantId, isScrumMaster: true, nickname: 'Tester', teamId: 't' } as SocketData);
  }

  it('rejects content longer than MAX_CONTENT_CHARS without writing a row', () => {
    const { handlers, emitted } = harness();
    handlers.get(SOCKET_EVENTS.COMMENT_CREATE)!({
      cardId,
      content: 'x'.repeat(MAX_CONTENT_CHARS + 1),
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
    expect(commentRepo.findByCardId(cardId)).toHaveLength(0);
  });

  it('accepts content exactly at MAX_CONTENT_CHARS', () => {
    const { handlers, emitted } = harness();
    handlers.get(SOCKET_EVENTS.COMMENT_CREATE)!({
      cardId,
      content: 'x'.repeat(MAX_CONTENT_CHARS),
    });

    expect(emitted).toHaveLength(0);
    const comments = commentRepo.findByCardId(cardId);
    expect(comments).toHaveLength(1);
    expect(comments[0].content.length).toBe(MAX_CONTENT_CHARS);
  });
});
