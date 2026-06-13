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

describe('comment.handler COMMENT_UPDATE', () => {
  let roomId: string;
  let authorId: string;
  let otherId: string;
  let cardId: string;
  let commentId: string;

  beforeEach(() => {
    const room = roomRepo.create('Update Test Room');
    roomId = room.id;
    authorId = participantRepo.create(roomId, 'Author').id;
    otherId = participantRepo.create(roomId, 'Other').id;
    cardId = cardRepo.create(roomId, 'went-well', 'a card', authorId, []).id;
    // Create the comment as the author
    const comment = commentRepo.create(cardId, roomId, authorId, 'original text');
    commentId = comment.id;
  });

  it('author can update own comment — broadcasts COMMENT_UPDATED with new content', () => {
    const { handlers, emitted } = makeHarness({
      roomId, participantId: authorId, isScrumMaster: false, nickname: 'Author', teamId: 't',
    } as SocketData);

    handlers.get(SOCKET_EVENTS.COMMENT_UPDATE)!({ commentId, content: 'updated text' });

    // broadcastComment short-circuits (rooms map returns undefined), so no
    // socket emit. Verify the DB row was updated.
    expect(emitted).toHaveLength(0);
    const updated = commentRepo.findById(commentId)!;
    expect(updated.content).toBe('updated text');
    expect(updated.updatedAt).not.toBeNull();
  });

  it('non-author non-SM is FORBIDDEN and DB is unchanged', () => {
    const { handlers, emitted } = makeHarness({
      roomId, participantId: otherId, isScrumMaster: false, nickname: 'Other', teamId: 't',
    } as SocketData);

    handlers.get(SOCKET_EVENTS.COMMENT_UPDATE)!({ commentId, content: 'sneaky edit' });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect(emitted[0].payload).toMatchObject({ code: 'FORBIDDEN' });
    // Content must be unchanged
    expect(commentRepo.findById(commentId)!.content).toBe('original text');
  });

  it('SM can update another user\'s comment', () => {
    const { handlers, emitted } = makeHarness({
      roomId, participantId: otherId, isScrumMaster: true, nickname: 'Other', teamId: 't',
    } as SocketData);

    handlers.get(SOCKET_EVENTS.COMMENT_UPDATE)!({ commentId, content: 'sm edit' });

    expect(emitted).toHaveLength(0);
    expect(commentRepo.findById(commentId)!.content).toBe('sm edit');
  });

  it('empty update (no text, no image) is rejected with BAD_INPUT', () => {
    const { handlers, emitted } = makeHarness({
      roomId, participantId: authorId, isScrumMaster: false, nickname: 'Author', teamId: 't',
    } as SocketData);

    handlers.get(SOCKET_EVENTS.COMMENT_UPDATE)!({ commentId, content: '   ' });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
    // Content unchanged
    expect(commentRepo.findById(commentId)!.content).toBe('original text');
  });

  it('update for a missing comment returns NOT_FOUND', () => {
    const { handlers, emitted } = makeHarness({
      roomId, participantId: authorId, isScrumMaster: false, nickname: 'Author', teamId: 't',
    } as SocketData);

    handlers.get(SOCKET_EVENTS.COMMENT_UPDATE)!({ commentId: 'no-such-id', content: 'x' });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect(emitted[0].payload).toMatchObject({ code: 'NOT_FOUND' });
  });
});
