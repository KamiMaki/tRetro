import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { roomSectionRepo } from '../../db/repositories/room-section.repo';
import { cardRepo } from '../../db/repositories/card.repo';
import { generateId } from '../../utils/id';
import type { SocketData } from '../middleware';
import type {
  CreateSectionPayload,
  UpdateSectionPayload,
  DeleteSectionPayload,
  ReorderSectionsPayload,
} from '../../types';
import {
  MAX_SECTION_LABEL_CHARS,
  MAX_SECTION_EMOJI_CHARS,
  isValidSectionTone,
} from './limits';

/**
 * Live board-section editor (US-003). Every action mutates the room's
 * room_sections snapshot then re-broadcasts the full ordered list to the
 * room so all clients converge. Mirrors the structure of comment.handler:
 * per-event socket.on, validation up front, ERROR emit (繁中 message) on a
 * bad request, io.to(roomId) for the success broadcast.
 *
 * Editing a room's sections never touches the owning team's team_sections —
 * the room keeps its own snapshot (see plan: a room's layout is independent
 * of the team defaults once created).
 */
export function registerSectionHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  /** Re-emit the room's full section list after any mutation. */
  function broadcast(): void {
    io.to(data.roomId).emit(SOCKET_EVENTS.SECTIONS_UPDATED, {
      sections: roomSectionRepo.findByRoomId(data.roomId),
    });
  }

  /** Shared label/tone validation. Returns a trimmed label or null (emitting
   *  the appropriate ERROR) when the input is unusable. */
  function validateLabel(rawLabel: unknown): string | null {
    if (typeof rawLabel !== 'string') {
      socket.emit(SOCKET_EVENTS.ERROR, { message: '區塊名稱無效', code: 'BAD_INPUT' });
      return null;
    }
    const label = rawLabel.trim();
    if (!label) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: '區塊名稱不可空白', code: 'BAD_INPUT' });
      return null;
    }
    if (label.length > MAX_SECTION_LABEL_CHARS) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: `區塊名稱過長（上限 ${MAX_SECTION_LABEL_CHARS} 字）`,
        code: 'BAD_INPUT',
      });
      return null;
    }
    return label;
  }

  socket.on(SOCKET_EVENTS.SECTION_CREATE, (payload: CreateSectionPayload) => {
    try {
      const label = validateLabel(payload?.label);
      if (label === null) return;
      if (!isValidSectionTone(payload?.tone)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '色調無效', code: 'BAD_INPUT' });
        return;
      }
      const emoji = (payload?.emoji ?? '').trim().slice(0, MAX_SECTION_EMOJI_CHARS) || '🗒️';
      // Unique, collision-resistant section_key for the new column.
      const sectionKey = `custom-${generateId(8)}`;
      roomSectionRepo.create(data.roomId, sectionKey, label, emoji, payload.tone);
      broadcast();
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to create section', code: 'CREATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.SECTION_UPDATE, (payload: UpdateSectionPayload) => {
    try {
      const existing = payload?.id ? roomSectionRepo.findById(payload.id) : null;
      if (!existing || existing.roomId !== data.roomId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Section not found', code: 'NOT_FOUND' });
        return;
      }
      const updates: { label?: string; emoji?: string; tone?: typeof existing.tone } = {};
      if (payload.label !== undefined) {
        const label = validateLabel(payload.label);
        if (label === null) return;
        updates.label = label;
      }
      if (payload.tone !== undefined) {
        if (!isValidSectionTone(payload.tone)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '色調無效', code: 'BAD_INPUT' });
          return;
        }
        updates.tone = payload.tone;
      }
      if (payload.emoji !== undefined) {
        updates.emoji = payload.emoji.trim().slice(0, MAX_SECTION_EMOJI_CHARS) || '🗒️';
      }
      roomSectionRepo.update(existing.id, updates);
      broadcast();
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to update section', code: 'UPDATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.SECTION_DELETE, (payload: DeleteSectionPayload) => {
    try {
      const existing = payload?.id ? roomSectionRepo.findById(payload.id) : null;
      if (!existing || existing.roomId !== data.roomId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Section not found', code: 'NOT_FOUND' });
        return;
      }
      const cardCount = roomSectionRepo.cardCount(data.roomId, existing.sectionKey);
      const moveTo = payload.moveToSectionKey;
      if (cardCount > 0) {
        // Refuse to orphan cards. The client must pick a destination section.
        if (!moveTo) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: '此區塊仍有卡片，請先選擇要移動到哪個區塊',
            code: 'SECTION_NOT_EMPTY',
          });
          return;
        }
        const dest = roomSectionRepo
          .findByRoomId(data.roomId)
          .find((s) => s.sectionKey === moveTo && s.id !== existing.id);
        if (!dest) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '目標區塊不存在', code: 'BAD_INPUT' });
          return;
        }
        // Move every card out of the doomed section first, then delete it.
        for (const card of cardRepo.findByRoomId(data.roomId)) {
          if (card.section === existing.sectionKey) {
            cardRepo.update(card.id, { section: moveTo });
          }
        }
      }
      roomSectionRepo.delete(existing.id);
      broadcast();
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to delete section', code: 'DELETE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.SECTION_REORDER, (payload: ReorderSectionsPayload) => {
    try {
      if (!Array.isArray(payload?.orderedIds)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '排序資料無效', code: 'BAD_INPUT' });
        return;
      }
      roomSectionRepo.reorder(data.roomId, payload.orderedIds);
      broadcast();
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to reorder sections', code: 'REORDER_FAILED' });
    }
  });
}
