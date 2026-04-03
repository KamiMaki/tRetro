import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { voteRepo } from '../../db/repositories/vote.repo';
import type { SocketData } from '../middleware';
import type { ToggleVotePayload } from '../../types';

export function registerVoteHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.VOTE_TOGGLE, (payload: ToggleVotePayload) => {
    try {
      voteRepo.toggle(payload.cardId, data.roomId, data.participantId);
      // Broadcast per-socket (hasVoted differs per viewer)
      const sockets = io.sockets.adapter.rooms.get(data.roomId);
      if (!sockets) return;
      const count = voteRepo.getCountByCardId(payload.cardId);
      const voterIds = voteRepo.getVoterIds(payload.cardId);
      for (const socketId of sockets) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (!targetSocket) continue;
        const targetData = targetSocket.data as SocketData;
        targetSocket.emit(SOCKET_EVENTS.VOTE_UPDATED, {
          cardId: payload.cardId,
          voteCount: count,
          hasVoted: voterIds.includes(targetData.participantId),
        });
      }
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to toggle vote', code: 'TOGGLE_FAILED' });
    }
  });
}
