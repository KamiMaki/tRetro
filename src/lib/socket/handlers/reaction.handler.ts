import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { reactionRepo } from '../../db/repositories/reaction.repo';
import type { SocketData } from '../middleware';
import type { ToggleReactionPayload } from '../../types';

export function registerReactionHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.REACTION_TOGGLE, (payload: ToggleReactionPayload) => {
    try {
      reactionRepo.toggle(payload.cardId, data.roomId, data.participantId, payload.emoji);
      // Broadcast updated reaction summary per-socket (hasReacted differs per viewer)
      const sockets = io.sockets.adapter.rooms.get(data.roomId);
      if (!sockets) return;
      const summaries = reactionRepo.getByCardId(payload.cardId);
      for (const socketId of sockets) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (!targetSocket) continue;
        const targetData = targetSocket.data as SocketData;
        const reactions = summaries.map(r => ({
          emoji: r.emoji,
          count: r.count,
          hasReacted: r.participantIds.includes(targetData.participantId),
        }));
        targetSocket.emit(SOCKET_EVENTS.REACTION_UPDATED, { cardId: payload.cardId, reactions });
      }
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to toggle reaction', code: 'TOGGLE_FAILED' });
    }
  });
}
