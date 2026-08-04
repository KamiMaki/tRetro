import type { RoomFocusState } from '../types';

/**
 * In-memory "who is presenting, and on which card" per room.
 *
 * Presenting is claimed rather than granted: this app makes every participant
 * a Scrum Master (see participant.repo.ts), so there is no single facilitator
 * to gate on. One person takes the wheel, everyone else may follow, and any
 * of them can take over.
 *
 * Advisory like phase-store: losing it on restart just means nobody is
 * presenting yet. The presenter's socket id is tracked alongside so a stale
 * disconnect (the same person reloading their tab) cannot free a room the
 * new socket has already claimed — it never leaves this module.
 */
interface FocusEntry extends RoomFocusState {
  socketId: string;
}

const focusByRoom: Map<string, FocusEntry> = new Map();

/** The public state: who is presenting and where. Null = nobody. */
export function getFocusState(roomId: string): RoomFocusState | null {
  const entry = focusByRoom.get(roomId);
  return entry ? { presenterId: entry.presenterId, cardId: entry.cardId } : null;
}

/**
 * Take the wheel. Last claim wins — a takeover needs no permission from the
 * outgoing presenter. A claim that names no card inherits the card the room
 * is already on, so followers are not yanked to nowhere mid-handover.
 */
export function claimFocus(
  roomId: string,
  presenterId: string,
  socketId: string,
  cardId: string | null,
): RoomFocusState {
  const previous = focusByRoom.get(roomId);
  const entry: FocusEntry = {
    presenterId,
    socketId,
    cardId: cardId ?? previous?.cardId ?? null,
  };
  focusByRoom.set(roomId, entry);
  return { presenterId: entry.presenterId, cardId: entry.cardId };
}

/**
 * Move the room to another card. Only the current presenter can; everyone
 * else gets null back and the caller drops the request in silence.
 */
export function setFocusCard(
  roomId: string,
  presenterId: string,
  cardId: string,
): RoomFocusState | null {
  const entry = focusByRoom.get(roomId);
  if (!entry || entry.presenterId !== presenterId) return null;
  entry.cardId = cardId;
  return { presenterId: entry.presenterId, cardId };
}

/**
 * Step aside. Returns true only when this actually freed the room, so the
 * caller knows whether to broadcast.
 *
 * `by.socketId` is the disconnect path: it frees the room only if the socket
 * that died is the one still holding it. `by.presenterId` is the explicit
 * "stop presenting" button.
 */
export function releaseFocus(
  roomId: string,
  by: { presenterId?: string; socketId?: string },
): boolean {
  const entry = focusByRoom.get(roomId);
  if (!entry) return false;
  if (by.socketId != null && entry.socketId !== by.socketId) return false;
  if (by.presenterId != null && entry.presenterId !== by.presenterId) return false;
  focusByRoom.delete(roomId);
  return true;
}

export function clearFocusState(roomId: string): void {
  focusByRoom.delete(roomId);
}
