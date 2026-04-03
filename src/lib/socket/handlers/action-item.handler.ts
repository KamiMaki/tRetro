import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { actionItemRepo } from '../../db/repositories/action-item.repo';
import type { SocketData } from '../middleware';
import type { CreateActionItemPayload, UpdateActionItemPayload } from '../../types';

export function registerActionItemHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.ACTION_CREATE, (payload: CreateActionItemPayload) => {
    if (!data.isScrumMaster) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only Scrum Master can manage action items', code: 'FORBIDDEN' });
      return;
    }
    try {
      const item = actionItemRepo.create(data.roomId, payload.description, payload.assignee, payload.dueDate);
      io.to(data.roomId).emit(SOCKET_EVENTS.ACTION_CREATED, item);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to create action item', code: 'CREATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.ACTION_UPDATE, (payload: UpdateActionItemPayload) => {
    if (!data.isScrumMaster) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only Scrum Master can manage action items', code: 'FORBIDDEN' });
      return;
    }
    try {
      const item = actionItemRepo.update(payload.actionItemId, {
        description: payload.description,
        assignee: payload.assignee,
        dueDate: payload.dueDate,
        isCompleted: payload.isCompleted,
      });
      if (item) {
        io.to(data.roomId).emit(SOCKET_EVENTS.ACTION_UPDATED, item);
      }
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to update action item', code: 'UPDATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.ACTION_DELETE, ({ actionItemId }: { actionItemId: string }) => {
    if (!data.isScrumMaster) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only Scrum Master can manage action items', code: 'FORBIDDEN' });
      return;
    }
    try {
      actionItemRepo.delete(actionItemId);
      io.to(data.roomId).emit(SOCKET_EVENTS.ACTION_DELETED, { actionItemId });
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to delete action item', code: 'DELETE_FAILED' });
    }
  });
}
