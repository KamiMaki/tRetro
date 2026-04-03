import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { cardRepo } from '../../db/repositories/card.repo';
import { participantRepo } from '../../db/repositories/participant.repo';
import { toCardDTO } from '../dto';
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
    const dto = toCardDTO(card, targetData.participantId);
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
      // Permission: only author can update
      if (card.authorId !== data.participantId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the author can update this card', code: 'FORBIDDEN' });
        return;
      }
      const updated = cardRepo.update(payload.cardId, {
        content: payload.content,
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
        targetSocket.emit(SOCKET_EVENTS.CARD_UPDATED, toCardDTO(updated, targetData.participantId));
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

  socket.on(SOCKET_EVENTS.CARD_REVEAL, ({ cardId }: { cardId: string }) => {
    try {
      const card = cardRepo.findById(cardId);
      if (!card) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Card not found', code: 'NOT_FOUND' });
        return;
      }
      // Permission: only author can reveal
      if (card.authorId !== data.participantId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the author can reveal identity', code: 'FORBIDDEN' });
        return;
      }
      cardRepo.reveal(cardId);
      const author = participantRepo.findById(card.authorId);
      io.to(data.roomId).emit(SOCKET_EVENTS.CARD_REVEALED, {
        cardId,
        authorNickname: author?.nickname ?? 'Unknown',
      });
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to reveal card', code: 'REVEAL_FAILED' });
    }
  });
}
