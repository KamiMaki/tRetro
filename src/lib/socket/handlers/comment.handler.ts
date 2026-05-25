import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { commentRepo } from '../../db/repositories/comment.repo';
import { roomRepo } from '../../db/repositories/room.repo';
import { toCommentDTO } from '../dto';
import type { SocketData } from '../middleware';
import type { CreateCommentPayload } from '../../types';

export function registerCommentHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.COMMENT_CREATE, (payload: CreateCommentPayload) => {
    try {
      const comment = commentRepo.create(
        payload.cardId, data.roomId, data.participantId, payload.content
      );
      // Anonymous rooms strip identity on the wire; named rooms carry
      // the author nickname automatically (matches the always-show-author
      // pattern used for cards via toCardDTO).
      const room = roomRepo.findById(data.roomId);
      const dto = toCommentDTO(comment, room?.isAnonymous ?? false);
      io.to(data.roomId).emit(SOCKET_EVENTS.COMMENT_CREATED, dto);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to create comment', code: 'CREATE_FAILED' });
    }
  });
}
