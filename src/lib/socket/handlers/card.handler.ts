import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { cardRepo } from '../../db/repositories/card.repo';
import { participantRepo } from '../../db/repositories/participant.repo';
import { toCardDTOv2 } from '../dto';
import type { SocketData } from '../middleware';
import type { CreateCardPayload, UpdateCardPayload } from '../../types';

function broadcastCard(io: Server, roomId: string, card: ReturnType<typeof cardRepo.findById>) {
  if (!card) return;
  // Send per-socket to preserve isOwnCard
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;

  for (const socketId of sockets) {
    const targetSocket = io.sockets.sockets.get(socketId);
    if (!targetSocket) continue;
    const targetData = targetSocket.data as SocketData;
    const dto = toCardDTOv2(card, targetData.participantId);
    targetSocket.emit(SOCKET_EVENTS.CARD_CREATED, dto);
  }
}

export function registerCardHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.CARD_CREATE, (payload: CreateCardPayload) => {
    try {
      const card = cardRepo.create(
        data.roomId, payload.section, payload.content, data.participantId, payload.tagIds
      );
      broadcastCard(io, data.roomId, card);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to create card', code: 'CREATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.CARD_UPDATE, (payload: UpdateCardPayload) => {
    try {
      const card = cardRepo.findById(payload.cardId);
      if (!card) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
        return;
      }
      const isAuthor = card.authorId === data.participantId;
      const isSM = data.isScrumMaster;
      // Permission: author can edit anything; SM can re-tag any card.
      if (!isAuthor && !isSM) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'No permission to update this card', code: 'FORBIDDEN' });
        return;
      }
      if (!isAuthor && payload.content !== undefined) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the author can edit card text', code: 'FORBIDDEN' });
        return;
      }
      const updated = cardRepo.update(payload.cardId, {
        content: isAuthor ? payload.content : undefined,
        tagIds: payload.tagIds,
      });
      if (!updated) return;

      // Broadcast updated card to all
      const sockets = io.sockets.adapter.rooms.get(data.roomId);
      if (!sockets) return;
      for (const socketId of sockets) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (!targetSocket) continue;
        const targetData = targetSocket.data as SocketData;
        targetSocket.emit(SOCKET_EVENTS.CARD_UPDATED, toCardDTOv2(updated, targetData.participantId));
      }
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to update card', code: 'UPDATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.CARD_DELETE, ({ cardId }: { cardId: string }) => {
    try {
      const card = cardRepo.findById(cardId);
      if (!card) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
        return;
      }
      // Permission: author or SM can delete
      if (card.authorId !== data.participantId && !data.isScrumMaster) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'No permission to delete this card', code: 'FORBIDDEN' });
        return;
      }
      cardRepo.delete(cardId);
      io.to(data.roomId).emit(SOCKET_EVENTS.CARD_DELETED, { cardId });
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to delete card', code: 'DELETE_FAILED' });
    }
  });

  socket.on(
    SOCKET_EVENTS.CARD_REVEAL,
    ({ cardId, nickname }: { cardId: string; nickname?: string }) => {
      try {
        const card = cardRepo.findById(cardId);
        if (!card) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
          return;
        }
        if (card.authorId !== data.participantId) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the author can reveal identity', code: 'FORBIDDEN' });
          return;
        }
        const fallback = participantRepo.findById(card.authorId)?.nickname ?? 'Unknown';
        const trimmed = (nickname ?? '').trim();
        const finalName = trimmed.length > 0 ? trimmed.slice(0, 40) : fallback;
        cardRepo.reveal(cardId, finalName);
        io.to(data.roomId).emit(SOCKET_EVENTS.CARD_REVEALED, {
          cardId,
          authorNickname: finalName,
        });
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to reveal card', code: 'REVEAL_FAILED' });
      }
    },
  );

  socket.on(SOCKET_EVENTS.CARD_UNREVEAL, ({ cardId }: { cardId: string }) => {
    try {
      const card = cardRepo.findById(cardId);
      if (!card) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
        return;
      }
      if (card.authorId !== data.participantId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the author can hide identity', code: 'FORBIDDEN' });
        return;
      }
      cardRepo.unreveal(cardId);
      io.to(data.roomId).emit(SOCKET_EVENTS.CARD_UNREVEALED, { cardId });
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to hide card', code: 'UNREVEAL_FAILED' });
    }
  });

  socket.on(
    SOCKET_EVENTS.CARD_MOVE,
    ({ cardId, section }: { cardId: string; section: string }) => {
      try {
        const card = cardRepo.findById(cardId);
        if (!card) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
          return;
        }
        const allowed: ReadonlySet<string> = new Set([
          'went-well',
          'to-improve',
          'thanks',
          'deep-dive',
        ]);
        if (!allowed.has(section)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid section', code: 'BAD_INPUT' });
          return;
        }
        if (card.section === section) return;
        const updated = cardRepo.update(cardId, { section });
        if (!updated) return;
        const sockets = io.sockets.adapter.rooms.get(data.roomId);
        if (!sockets) return;
        for (const socketId of sockets) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (!targetSocket) continue;
          const targetData = targetSocket.data as SocketData;
          targetSocket.emit(SOCKET_EVENTS.CARD_UPDATED, toCardDTOv2(updated, targetData.participantId));
        }
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to move card', code: 'MOVE_FAILED' });
      }
    },
  );

  socket.on(
    SOCKET_EVENTS.CARD_PARK,
    ({ cardId, isParked }: { cardId: string; isParked: boolean }) => {
      try {
        if (!data.isScrumMaster) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: 'Only a Scrum Master can park cards',
            code: 'FORBIDDEN',
          });
          return;
        }
        const card = cardRepo.findById(cardId);
        if (!card) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
          return;
        }
        const next = !!isParked;
        if (card.isParked === next) return;
        const updated = cardRepo.setParked(cardId, next);
        if (!updated) return;
        const sockets = io.sockets.adapter.rooms.get(data.roomId);
        if (!sockets) return;
        for (const socketId of sockets) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (!targetSocket) continue;
          const targetData = targetSocket.data as SocketData;
          targetSocket.emit(
            SOCKET_EVENTS.CARD_UPDATED,
            toCardDTOv2(updated, targetData.participantId),
          );
        }
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Failed to park card',
          code: 'PARK_FAILED',
        });
      }
    },
  );
}
