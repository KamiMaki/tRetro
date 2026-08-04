import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { cardRepo } from '../../db/repositories/card.repo';
import {
  CHEER_RATE_MAX,
  CHEER_RATE_WINDOW_MS,
  COMBO_COOLDOWN_MS,
  COMBO_MIN_CHEERS,
  COMBO_MIN_PARTICIPANTS,
  COMBO_WINDOW_MS,
  isValidCheerEffect,
} from './limits';
import type { SocketData } from '../middleware';
import type { CheerBurstPayload, CheerComboPayload, CheerEffect, SendCheerPayload } from '../../types';

// Sliding-window cheer budget, keyed by participant. Purely in-memory: a cheer
// leaves no trace anywhere else, so a process restart forgiving everyone's
// budget is exactly the right behaviour. Each key is pruned on access, so the
// map only holds participants who cheered inside the last window.
const cheerWindows = new Map<string, number[]>();

function withinBudget(participantId: string, now: number): boolean {
  const cutoff = now - CHEER_RATE_WINDOW_MS;
  const recent = (cheerWindows.get(participantId) ?? []).filter((t) => t > cutoff);
  if (recent.length >= CHEER_RATE_MAX) {
    cheerWindows.set(participantId, recent);
    return false;
  }
  recent.push(now);
  cheerWindows.set(participantId, recent);
  return true;
}

// ───── Combo bookkeeping ─────
// Per room+effect: the accepted cheers inside the combo window, and when that
// pair last comboed. Both are pruned on access and both are in-memory for the
// same reason the rate limiter is — a combo is a moment, not a record.
interface ComboEntry {
  participantId: string;
  ts: number;
}
const comboWindows = new Map<string, ComboEntry[]>();
const comboLastFiredAt = new Map<string, number>();

/**
 * Records one accepted cheer and reports the combo it just completed, if any.
 *
 * A combo needs COMBO_MIN_CHEERS cheers of the same effect inside
 * COMBO_WINDOW_MS from at least COMBO_MIN_PARTICIPANTS distinct people — one
 * person mashing a button never qualifies, however fast they mash. Cards are
 * deliberately not part of the key: a room rallying behind two neighbouring
 * cards is still the room cheering together.
 */
function registerComboCheer(
  roomId: string,
  effect: CheerEffect,
  participantId: string,
  now: number,
): number | null {
  const key = `${roomId}::${effect}`;
  const cutoff = now - COMBO_WINDOW_MS;
  const recent = (comboWindows.get(key) ?? []).filter((e) => e.ts > cutoff);
  recent.push({ participantId, ts: now });
  comboWindows.set(key, recent);

  if (recent.length < COMBO_MIN_CHEERS) return null;
  const distinct = new Set(recent.map((e) => e.participantId)).size;
  if (distinct < COMBO_MIN_PARTICIPANTS) return null;

  const lastFired = comboLastFiredAt.get(key);
  if (lastFired != null && now - lastFired < COMBO_COOLDOWN_MS) return null;

  comboLastFiredAt.set(key, now);
  return recent.length;
}

// Per room+card cheer tally, for the heat glow. Unbounded by design: it grows
// with one integer per card that has ever been cheered in a live room, and
// dies with the process along with everything else about cheers.
const cardCheerTotals = new Map<string, number>();

function bumpCardTotal(roomId: string, cardId: string): number {
  const key = `${roomId}::${cardId}`;
  const next = (cardCheerTotals.get(key) ?? 0) + 1;
  cardCheerTotals.set(key, next);
  return next;
}

/**
 * Cheers — ephemeral celebration effects during discussion.
 *
 * Nothing is persisted and nothing is acknowledged: a valid cheer fans out to
 * the whole room (sender included, so they see their own burst) and an invalid
 * or over-budget one is dropped in silence.
 *
 * `now` is injectable so the sliding window can be tested without fake timers.
 */
export function registerCheerHandlers(io: Server, socket: Socket, now: () => number = Date.now): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.CHEER_SEND, (payload: SendCheerPayload | undefined) => {
    const cardId = payload?.cardId;
    if (typeof cardId !== 'string' || cardId.length === 0) return;
    if (!isValidCheerEffect(payload?.effect)) return;

    // The card must live in this room — otherwise a crafted cardId could make
    // a burst appear over a card in someone else's retro.
    const card = cardRepo.findById(cardId);
    if (!card || card.roomId !== data.roomId) return;

    if (!withinBudget(data.participantId, now())) return;

    // No sender travels with the burst — no name, not even a null placeholder.
    // Cheering should feel free rather than tracked, so identity never leaves
    // this function, in named and anonymous rooms alike.
    const effect = payload!.effect;
    const burst: CheerBurstPayload = {
      cardId,
      effect,
      cardCheerTotal: bumpCardTotal(data.roomId, cardId),
    };
    io.to(data.roomId).emit(SOCKET_EVENTS.CHEER_BURST, burst);

    // …and when the room cheered together, a second, louder event on top.
    const comboCount = registerComboCheer(data.roomId, effect, data.participantId, now());
    if (comboCount != null) {
      const combo: CheerComboPayload = { effect, count: comboCount };
      io.to(data.roomId).emit(SOCKET_EVENTS.CHEER_COMBO, combo);
    }
  });
}
