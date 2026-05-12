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
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to save drawing', code: 'CREATE_FAILED' });
    }
  });

  /**
   * Delete a drawing. Only the original author or the room SM may
   * remove a drawing — matches the rule we already use for card
   * deletion. Broadcasts the deletion so every client drops the
   * thumbnail in lockstep.
   */
  socket.on(SOCKET_EVENTS.DRAWING_DELETE, (payload: { drawingId: string }) => {
    try {
      const drawingId = payload?.drawingId;
      if (typeof drawingId !== 'string' || !drawingId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'drawingId required', code: 'INVALID_PAYLOAD' });
        return;
      }
      const authorId = drawingRepo.authorIdFor(drawingId);
      if (!authorId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Drawing not found', code: 'NOT_FOUND' });
        return;
      }
      const allowed = authorId === data.participantId || data.isScrumMaster;
      if (!allowed) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the author or SM can delete this drawing', code: 'FORBIDDEN' });
        return;
      }
      drawingRepo.delete(drawingId);
      io.to(data.roomId).emit(SOCKET_EVENTS.DRAWING_DELETED, { drawingId });
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to delete drawing', code: 'DELETE_FAILED' });
    }
  });
}
