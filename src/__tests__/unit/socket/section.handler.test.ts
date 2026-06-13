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

import { registerSectionHandlers } from '@/lib/socket/handlers/section.handler';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { cardRepo } from '@/lib/db/repositories/card.repo';
import { roomSectionRepo } from '@/lib/db/repositories/room-section.repo';
import type { RoomSection } from '@/lib/types';

interface EmittedEvent {
  event: string;
  payload: unknown;
}

/**
 * Harness that captures both the socket's own emits (errors) and the
 * io.to(roomId).emit broadcasts (SECTIONS_UPDATED). Unlike the comment
 * handler test we DO record broadcasts so we can assert the section list
 * that fans out.
 */
function makeHarness(data: SocketData) {
  const handlers = new Map<string, (payload: unknown) => void>();
  const emitted: EmittedEvent[] = [];
  const broadcasts: EmittedEvent[] = [];
  const socket = {
    data,
    on: (event: string, cb: (payload: unknown) => void) => {
      handlers.set(event, cb);
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  };
  const io = {
    to: (_roomId: string) => ({
      emit: (event: string, payload: unknown) => {
        broadcasts.push({ event, payload });
      },
    }),
  };
  registerSectionHandlers(io as unknown as Server, socket as unknown as Socket);
  return { handlers, emitted, broadcasts };
}

function lastBroadcastSections(broadcasts: EmittedEvent[]): RoomSection[] {
  const last = broadcasts[broadcasts.length - 1];
  return (last?.payload as { sections: RoomSection[] }).sections;
}

describe('section.handler', () => {
  let roomId: string;
  let participantId: string;

  beforeEach(() => {
    // A team-owned room so room_sections gets seeded from the classic template.
    const room = roomRepo.create('Section Room', 'classic', null);
    roomId = room.id;
    participantId = participantRepo.create(roomId, 'Tester').id;
  });

  function harness() {
    return makeHarness({
      roomId,
      participantId,
      isScrumMaster: true,
      nickname: 'Tester',
      teamId: 't',
    } as SocketData);
  }

  it('SECTION_CREATE appends a section and broadcasts the full list', () => {
    const { handlers, emitted, broadcasts } = harness();
    const before = roomSectionRepo.findByRoomId(roomId).length;

    handlers.get(SOCKET_EVENTS.SECTION_CREATE)!({ label: 'New Bucket', emoji: '🪣', tone: 'cyan' });

    expect(emitted).toHaveLength(0);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0].event).toBe(SOCKET_EVENTS.SECTIONS_UPDATED);
    const sections = lastBroadcastSections(broadcasts);
    expect(sections).toHaveLength(before + 1);
    const created = sections.find((s) => s.label === 'New Bucket')!;
    expect(created).toBeDefined();
    expect(created.emoji).toBe('🪣');
    expect(created.tone).toBe('cyan');
    expect(created.sectionKey).toMatch(/^custom-/);
  });

  it('SECTION_CREATE with an invalid tone is rejected (no write)', () => {
    const { handlers, emitted, broadcasts } = harness();
    const before = roomSectionRepo.findByRoomId(roomId).length;

    handlers.get(SOCKET_EVENTS.SECTION_CREATE)!({ label: 'Bad', emoji: '❓', tone: 'rainbow' });

    expect(broadcasts).toHaveLength(0);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
    expect(roomSectionRepo.findByRoomId(roomId)).toHaveLength(before);
  });

  it('SECTION_CREATE with a blank label is rejected', () => {
    const { handlers, emitted, broadcasts } = harness();
    handlers.get(SOCKET_EVENTS.SECTION_CREATE)!({ label: '   ', emoji: '❓', tone: 'mint' });
    expect(broadcasts).toHaveLength(0);
    expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
  });

  it('SECTION_UPDATE edits label/emoji/tone and broadcasts', () => {
    const { handlers, emitted, broadcasts } = harness();
    const target = roomSectionRepo.findByRoomId(roomId)[0];

    handlers.get(SOCKET_EVENTS.SECTION_UPDATE)!({
      id: target.id,
      label: 'Renamed',
      emoji: '✨',
      tone: 'amber',
    });

    expect(emitted).toHaveLength(0);
    const updated = lastBroadcastSections(broadcasts).find((s) => s.id === target.id)!;
    expect(updated.label).toBe('Renamed');
    expect(updated.emoji).toBe('✨');
    expect(updated.tone).toBe('amber');
  });

  it('SECTION_UPDATE for a section in another room returns NOT_FOUND', () => {
    const { handlers, emitted } = harness();
    // A section that belongs to a different room.
    const otherRoom = roomRepo.create('Other', 'classic', null);
    const foreign = roomSectionRepo.findByRoomId(otherRoom.id)[0];

    handlers.get(SOCKET_EVENTS.SECTION_UPDATE)!({ id: foreign.id, label: 'hax' });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].payload).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('SECTION_DELETE blocks when the section has cards and no moveToSectionKey', () => {
    const { handlers, emitted, broadcasts } = harness();
    const target = roomSectionRepo.findByRoomId(roomId)[0];
    // Put a card in the section so it is non-empty.
    cardRepo.create(roomId, target.sectionKey, 'a card', participantId, []);

    handlers.get(SOCKET_EVENTS.SECTION_DELETE)!({ id: target.id });

    expect(broadcasts).toHaveLength(0);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect(emitted[0].payload).toMatchObject({ code: 'SECTION_NOT_EMPTY' });
    // Section still present.
    expect(roomSectionRepo.findById(target.id)).not.toBeNull();
  });

  it('SECTION_DELETE moves cards then deletes when moveToSectionKey is given', () => {
    const { handlers, emitted, broadcasts } = harness();
    const all = roomSectionRepo.findByRoomId(roomId);
    const doomed = all[0];
    const dest = all[1];
    const card = cardRepo.create(roomId, doomed.sectionKey, 'survivor', participantId, []);

    handlers.get(SOCKET_EVENTS.SECTION_DELETE)!({
      id: doomed.id,
      moveToSectionKey: dest.sectionKey,
    });

    expect(emitted).toHaveLength(0);
    // Section gone from the broadcast list.
    expect(lastBroadcastSections(broadcasts).find((s) => s.id === doomed.id)).toBeUndefined();
    // The card was reassigned, not deleted.
    const moved = cardRepo.findById(card.id)!;
    expect(moved).not.toBeNull();
    expect(moved.section).toBe(dest.sectionKey);
  });

  it('SECTION_DELETE removes an empty section directly', () => {
    const { handlers, emitted, broadcasts } = harness();
    const target = roomSectionRepo.findByRoomId(roomId)[0];

    handlers.get(SOCKET_EVENTS.SECTION_DELETE)!({ id: target.id });

    expect(emitted).toHaveLength(0);
    expect(roomSectionRepo.findById(target.id)).toBeNull();
    expect(lastBroadcastSections(broadcasts).find((s) => s.id === target.id)).toBeUndefined();
  });

  it('SECTION_REORDER applies the new order and broadcasts it', () => {
    const { handlers, emitted, broadcasts } = harness();
    const original = roomSectionRepo.findByRoomId(roomId);
    const reversed = [...original].reverse().map((s) => s.id);

    handlers.get(SOCKET_EVENTS.SECTION_REORDER)!({ orderedIds: reversed });

    expect(emitted).toHaveLength(0);
    const broadcastIds = lastBroadcastSections(broadcasts).map((s) => s.id);
    expect(broadcastIds).toEqual(reversed);
  });

  it('SECTION_REORDER with a non-array payload is rejected', () => {
    const { handlers, emitted, broadcasts } = harness();
    handlers.get(SOCKET_EVENTS.SECTION_REORDER)!({ orderedIds: 'nope' as unknown as string[] });
    expect(broadcasts).toHaveLength(0);
    expect(emitted[0].payload).toMatchObject({ code: 'BAD_INPUT' });
  });
});
