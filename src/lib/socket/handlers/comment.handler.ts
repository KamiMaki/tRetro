import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { commentRepo } from '../../db/repositories/comment.repo';
import type { SocketData } from '../middleware';
import type { CreateCommentPayload } from '../../types';

export function registerCommentHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.COMMENT_CREATE, (payload: CreateCommentPayload) => {
    try {
      const comment = commentRepo.create(
        payload.cardId, data.roomId, data.participantId, payload.content
      );
      io.to(data.roomId).emit(SOCKET_EVENTS.COMMENT_CREATED, comment);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to create comment', code: 'CREATE_FAILED' });
    }
  });
}
