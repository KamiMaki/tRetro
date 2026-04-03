import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { drawingRepo } from '../../db/repositories/drawing.repo';
import type { SocketData } from '../middleware';
import type { CreateDrawingPayload } from '../../types';

export function registerDrawingHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.DRAWING_CREATE, (payload: CreateDrawingPayload) => {
    try {
      const drawing = drawingRepo.create(
        payload.cardId, data.roomId, data.participantId, payload.data
      );
      io.to(data.roomId).emit(SOCKET_EVENTS.DRAWING_CREATED, drawing);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to save drawing', code: 'CREATE_FAILED' });
    }
  });
}
