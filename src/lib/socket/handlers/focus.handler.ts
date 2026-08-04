import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { cardRepo } from '../../db/repositories/card.repo';
import { claimFocus, getFocusState, releaseFocus, setFocusCard } from '../focus-store';
import type { SocketData } from '../middleware';
import type { FocusUpdatedPayload } from '../../types';

/**
 * Follow the facilitator — presenter-claim model.
 *
 * Without this, every participant's "focused card" was private local state,
 * so a cheer sent by one person landed on a different card for everyone else.
 * The obvious fix — gate on the Scrum Master — does not work here: this app
 * deliberately makes *every* participant an SM (participant.repo.ts), so the
 * wheel has to be claimed instead. Anyone may claim it, the newest claim wins,
 * and only the holder can move the room.
 *
 * Everything is advisory: following is the client's choice, and the server
 * only publishes where the presenter is. Rejections are silent — a dropped
 * FOCUS_SET from someone who just lost the wheel is a race, not a mistake
 * worth putting a red toast in front of.
 */
export function registerFocusHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  const broadcast = (payload: FocusUpdatedPayload) => {
    io.to(data.roomId).emit(SOCKET_EVENTS.FOCUS_UPDATED, payload);
  };

  /** A card id we are willing to publish: present, and in this room. */
  const validCardId = (cardId: unknown): string | null => {
    if (typeof cardId !== 'string' || cardId.length === 0) return null;
    const card = cardRepo.findById(cardId);
    return card && card.roomId === data.roomId ? cardId : null;
  };

  // Take the wheel (or take it over). No permission needed from the outgoing
  // presenter — a retro where nobody can grab the thread is worse than one
  // where two people briefly bounce it between them.
  socket.on(SOCKET_EVENTS.FOCUS_CLAIM, (payload: { cardId?: string } | undefined) => {
    const next = claimFocus(data.roomId, data.participantId, socket.id, validCardId(payload?.cardId));
    broadcast(next);
  });

  // Step aside. Only the holder's release frees the room; anyone else's is a
  // stale click from a client that has not yet seen a takeover.
  socket.on(SOCKET_EVENTS.FOCUS_RELEASE, () => {
    if (releaseFocus(data.roomId, { presenterId: data.participantId })) {
      broadcast({ presenterId: null, cardId: null });
    }
  });

  // Move the room. Silently dropped from anyone who is not presenting, and
  // from a card that does not live in this room.
  socket.on(SOCKET_EVENTS.FOCUS_SET, (payload: { cardId?: string } | undefined) => {
    if (getFocusState(data.roomId)?.presenterId !== data.participantId) return;
    const cardId = validCardId(payload?.cardId);
    if (!cardId) return;
    const next = setFocusCard(data.roomId, data.participantId, cardId);
    if (next) broadcast(next);
  });

  // Presenter death: the wheel must not stay locked to a tab that closed.
  // Registered here rather than in room.handler's own disconnect listener so
  // focus stays self-contained — socket.io happily fans one event out to
  // several listeners.
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    if (releaseFocus(data.roomId, { socketId: socket.id })) {
      broadcast({ presenterId: null, cardId: null });
    }
  });
}
