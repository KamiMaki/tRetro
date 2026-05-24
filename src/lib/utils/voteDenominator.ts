/**
 * Resolve the denominator used for consensus calculations on votes.
 *
 * Priority:
 *   1. `room.participantCount` (the facilitator-configured headcount) when
 *      positive — this is the authoritative count for anonymous rooms,
 *      where session rows over-count (every tab mints a fresh Guest-XXX).
 *   2. `sessionParticipantCount` (the count of live participant rows)
 *      when the room has no configured count — the legacy behaviour for
 *      pre-team-spaces rooms.
 *   3. `1` as an absolute floor so `voteCount / denom` never divides by
 *      zero.
 *
 * Designed to be safe to call with a partial `room` (only
 * `participantCount` is read), so server and client can share it.
 */
export function resolveVoteDenominator(
  room: { participantCount?: number | null },
  sessionParticipantCount: number,
): number {
  if (room.participantCount != null && room.participantCount > 0) {
    return room.participantCount;
  }
  return Math.max(sessionParticipantCount, 1);
}
