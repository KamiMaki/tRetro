import type { Socket } from 'socket.io';
import { participantRepo } from '../db/repositories/participant.repo';
import { roomRepo } from '../db/repositories/room.repo';
// IMPORTANT: import from teamCookie (pure module), NOT teamAuth.
// teamAuth pulls in `next/server`, which crashes Node 22 + Next.js 16
// when loaded outside a request context (server startup).
import { parseTeamIdFromCookieHeader } from '../utils/teamCookie';

export interface SocketData {
  participantId: string;
  roomId: string;
  isScrumMaster: boolean;
  nickname: string;
  teamId: string;
}

/**
 * Three-stage handshake validation:
 *
 *  1. session token + roomId arrive in `handshake.auth` (existing behaviour)
 *  2. the participant row exists and belongs to the requested room
 *  3. the `tretro-team` cookie on the handshake matches the room's team
 *
 * Step 3 closes the loophole where a user authenticated to team A could
 * still hold a fresh session token for a room owned by team B, or
 * connect to an unclaimed room. Unclaimed rooms are rejected outright
 * here too — they go through the claim flow first via the dashboard.
 */
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

  const cookieHeader = socket.handshake.headers.cookie ?? null;
  const teamId = parseTeamIdFromCookieHeader(cookieHeader);
  if (!teamId) {
    return next(new Error('No team selected'));
  }

  const room = roomRepo.findById(roomId);
  if (!room) {
    return next(new Error('Room not found'));
  }
  if (room.teamId === null) {
    return next(new Error('Room is unclaimed — claim it first'));
  }
  if (room.teamId !== teamId) {
    return next(new Error('Room belongs to a different team'));
  }

  socket.data = {
    participantId: participant.id,
    roomId: participant.roomId,
    isScrumMaster: participant.isScrumMaster,
    nickname: participant.nickname,
    teamId,
  } satisfies SocketData;

  next();
}
