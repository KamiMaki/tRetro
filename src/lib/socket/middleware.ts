import type { Socket } from 'socket.io';
import { participantRepo } from '../db/repositories/participant.repo';

export interface SocketData {
  participantId: string;
  roomId: string;
  isScrumMaster: boolean;
  nickname: string;
}

export function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const { sessionToken, roomId } = socket.handshake.auth as { sessionToken?: string; roomId?: string };

  if (!sessionToken || !roomId) {
    return next(new Error('Missing sessionToken or roomId'));
  }

  const participant = participantRepo.findBySessionToken(sessionToken);
  if (!participant) {
    return next(new Error('Invalid session token'));
  }

  if (participant.roomId !== roomId) {
    return next(new Error('Participant does not belong to this room'));
  }

  socket.data = {
    participantId: participant.id,
    roomId: participant.roomId,
    isScrumMaster: participant.isScrumMaster,
    nickname: participant.nickname,
  } satisfies SocketData;

  next();
}
