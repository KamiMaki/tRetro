import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { tagRepo } from '../../db/repositories/tag.repo';
import type { SocketData } from '../middleware';
import type { CreateTagPayload } from '../../types';

export function registerTagHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.TAG_CREATE, (payload: CreateTagPayload) => {
    try {
      const tag = tagRepo.create(data.roomId, payload.name, payload.color);
      io.to(data.roomId).emit(SOCKET_EVENTS.TAG_CREATED, tag);
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: 'Failed to create tag (may already exist)',
        code: 'CREATE_FAILED',
      });
    }
  });
}
