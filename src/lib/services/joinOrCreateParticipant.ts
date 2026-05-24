import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import type { Participant } from '@/lib/types';

/**
 * Idempotent "ensure I'm a participant in this room" operation.
 *
 * The browser calls this every time it lands on /room/{id}. If sessionStorage
 * still carries a valid token for this room (refresh, tab restore, browser
 * back) we hand back the same participant. If the token is missing, stale
 * (DB wipe), or points to a different room, we mint a fresh one.
 *
 * Why this lives in a service and not inline in the route handler:
 *   - The legacy route trusted the client's cached sessionToken without
 *     verifying it, which left users stuck on a board whose socket connection
 *     silently failed with "Invalid session token" after any DB reset.
 *   - Centralising the reuse-vs-create decision here keeps the route a thin
 *     adapter and makes the recovery logic testable without HTTP plumbing.
 */
export type JoinResult =
  | { ok: true; participant: Participant; reused: boolean }
  | { ok: false; status: 400; error: 'Nickname is required' }
  | { ok: false; status: 404; error: 'Room not found' }
  | { ok: false; status: 410; error: 'Room is closed' };

export function joinOrCreateParticipant(
  roomId: string,
  nickname: string | undefined,
  existingSessionToken?: string | null,
): JoinResult {
  const room = roomRepo.findById(roomId);
  if (!room) {
    return { ok: false, status: 404, error: 'Room not found' };
  }
  if (room.status === 'closed') {
    return { ok: false, status: 410, error: 'Room is closed' };
  }

  // Reuse path: still-valid token for THIS room → same participant. We do
  // not refresh the nickname here; the participant keeps the name they
  // joined with so other members' UI doesn't shuffle on every refresh.
  if (existingSessionToken && existingSessionToken.length > 0) {
    const existing = participantRepo.findBySessionToken(existingSessionToken);
    if (existing && existing.roomId === roomId) {
      return { ok: true, participant: existing, reused: true };
    }
    // Token unknown or cross-room → fall through and mint fresh.
  }

  const trimmed = typeof nickname === 'string' ? nickname.trim() : '';
  if (trimmed.length === 0) {
    return { ok: false, status: 400, error: 'Nickname is required' };
  }

  const participant = participantRepo.create(roomId, trimmed);
  return { ok: true, participant, reused: false };
}
