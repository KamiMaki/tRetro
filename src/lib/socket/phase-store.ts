import type { RoomPhase, RoomPhaseState } from '../types';

/**
 * In-memory phase state per room.
 *
 * Phase is advisory — losing it on server restart is acceptable.
 * Default phase for any room with no recorded state is 'gather'.
 */
const phaseByRoom: Map<string, RoomPhaseState> = new Map();

export function getPhaseState(roomId: string): RoomPhaseState {
  return (
    phaseByRoom.get(roomId) ?? {
      phase: 'gather',
      startedAt: new Date(0).toISOString(),
      durationSec: null,
    }
  );
}

export function setPhaseState(
  roomId: string,
  next: { phase: RoomPhase; durationSec?: number | null },
): RoomPhaseState {
  const state: RoomPhaseState = {
    phase: next.phase,
    startedAt: new Date().toISOString(),
    durationSec: next.durationSec ?? null,
  };
  phaseByRoom.set(roomId, state);
  return state;
}

export function clearPhaseState(roomId: string): void {
  phaseByRoom.delete(roomId);
}
