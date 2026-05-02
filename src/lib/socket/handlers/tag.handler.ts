import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { tagRepo } from '../../db/repositories/tag.repo';
import type { SocketData } from '../middleware';
import type { CreateTagPayload } from '../../types';

export function registerTagHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.TAG_CREATE, (payload: CreateTagPayload & { isDefault?: boolean }) => {
    try {
      const tag = tagRepo.create(
        data.roomId,
        payload.name,
        payload.color,
        Boolean(payload.isDefault),
      );
      io.to(data.roomId).emit(SOCKET_EVENTS.TAG_CREATED, tag);
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: 'Failed to create tag (may already exist)',
        code: 'CREATE_FAILED',
      });
    }
  });

  socket.on(
    SOCKET_EVENTS.TAG_SET_DEFAULT,
    (payload: { tagId: string; isDefault: boolean }) => {
      if (!data.isScrumMaster) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Only the Scrum Master can change default tags',
          code: 'FORBIDDEN',
        });
        return;
      }
      const updated = tagRepo.setDefault(payload.tagId, Boolean(payload.isDefault));
      if (!updated || updated.roomId !== data.roomId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Tag not found', code: 'NOT_FOUND' });
        return;
      }
      io.to(data.roomId).emit(SOCKET_EVENTS.TAG_UPDATED, updated);
    },
  );
}
