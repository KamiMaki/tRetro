# Technical reference — Discussion mode + parking lot + Owner field

> 2026-05-05 · Scrum-Master-driven discussion view inspired by
> `tretro/project/screen-discussion.jsx` from Anthropic Design's handoff.
> Adds anonymity-only browsing, tag-grouped sort, parking lot, and a
> manual Owner input on action items.

## What changed (files)

### Schema + persistence
- `src/lib/db/schema.ts` — new `cards.is_parked INTEGER NOT NULL DEFAULT 0`.
- `src/lib/db/migrations.ts` — idempotent `ALTER TABLE cards ADD COLUMN is_parked` for existing dbs.
- `src/lib/db/repositories/card.repo.ts` —
  - `CardRow` includes `is_parked`
  - `toCardDB` maps it to `isParked: boolean`
  - new `setParked(id, isParked)` mutator

### Wire format
- `src/lib/types/index.ts` — `CardDB.isParked` and `CardDTO.isParked` are required fields.
- `src/lib/socket/dto.ts` — `toCardDTO` propagates `isParked`.
- `src/lib/socket/events.ts` — adds `CARD_PARK = 'card:park'`.
- `src/lib/socket/handlers/card.handler.ts` — handles `card:park`:
  - **SM-only** (`socket.data.isScrumMaster`)
  - validates the card exists; idempotent for same-state writes
  - writes via `cardRepo.setParked` then re-broadcasts `card:updated` per-socket so each client sees its own `isOwnCard`
- `src/lib/hooks/useRoom.ts` — exposes `setCardParked(cardId, isParked)`.

### UI
- `src/components/discussion/DiscussionPanel.tsx` — the new screen.
  Layout:
  - Header (sort selectors + counters)
  - Tag rail (auto-grouped, sortable by card count or vote total)
  - Body: main queue (left) + parking lot (right) on >=1024px, stacked below
  - Per card buttons: ➜ Action / ⏸ Park / ✓ Discussed (local marker only)
  - Renders `<article class="sticky-card">` directly — no `<Card>` reuse, on
    purpose, because Card.tsx pulls in reactions, comments, drawings, and
    drag/drop, none of which are wanted in facilitator-mode.
  - **Anonymity is unconditional.** Even if `card.isRevealed`, the
    DiscussionCard never reads `authorNickname`.
- `src/components/board/Card.tsx` — when `card.isParked`, renders a small
  `⏸ parked` chip in the top-right and drops opacity to 0.6, plus
  `data-parked` attribute for any future CSS hooks.
- `src/components/room/RoomBoard.tsx` — registers a 4th tab `Discussion`,
  visible only to SMs. Wires `D` keyboard shortcut. Tab badge shows the
  current parking-lot count.

### Action items: Owner is free text now
- `src/components/action-items/ActionItemForm.tsx` —
  - drops the `participants` prop entirely
  - replaces the `<select>` with `<input type="text">` named **Owner**
  - submits the trimmed value as `assignee` (the schema field is unchanged
    — only the input UX is different, so historic data is fully compatible)
- `src/components/action-items/ActionItemList.tsx` — drops the
  `participants` prop and stops forwarding it to ActionItemForm.
- `src/components/room/RoomBoard.tsx` — drops the prop in the
  `<ActionItemList>` call.

### Tests
- `src/__tests__/unit/repositories/card.repo.test.ts` — new `setParked`
  describe block (3 cases: default state, round-trip, ghost id).
- `src/__tests__/unit/socket/dto.test.ts` — `makeCard` fixture gains
  `isParked: false`.
- `src/__tests__/unit/utils/export.test.ts` — `makeCard` fixture gains
  `isParked: false`.

## Why this shape

The design canvas (screen-discussion.jsx) suggested a full-screen walkthrough
with prev/next chord controls. We chose to make Discussion **just another tab**
inside the existing room shell:

- No mode-switch dialog, no exit-mode escape hatch — toggling is one click.
- Reuses the existing `<RoomHeader>` + `<PhaseBar>` so the SM doesn't lose
  status indicators (live/connection, phase timer, share link).
- Keeps the Board / Action items tabs one click away — important when the
  team asks "wait, who else mentioned this?" and the SM needs to flip back.

Locally, the parking lot lives in the same panel as the queue rather than as
a separate "phase". The SM sees both at once; parking is reversible without
navigation.

## Why an `is_parked` column instead of local-only state

The design used `React.useState({ cardId: 'park' })` — purely local. We
persisted because:
1. SMs reconnecting (different tab, browser refresh, mobile pickup) shouldn't
   lose what they parked.
2. The badge on the main Board view (so other participants see the parked
   state too) requires a server-of-truth.
3. Future "carry parked items into next sprint" is trivial once it's a DB flag.

Local state ("Discussed" marker) is still local — it's intentionally
session-scoped and never reaches the server. Each retro starts fresh.

## Privacy notes

- The Discussion view re-uses `CardDTOv2` directly. We do **not** strip
  `authorNickname` from the wire — the client just refuses to render it in
  this screen. Rationale: the same DTO powers Board / History / Discussion;
  duplicating per-screen would invite drift.
- `setCardParked` is gated by SM check on the server (handler) AND on the
  client (tab visibility). Both are needed: client gating prevents accidental
  taps, server gating is the trust boundary.

## Caveats

- The `react-hooks/set-state-in-effect` warning in DiscussionPanel is silent
  because no effect setStates are needed. The `react-hooks/refs` rule is
  also clean.
- A non-SM reconnecting while the active tab is `'discussion'` would render
  nothing (the panel is conditionally mounted). Acceptable: a non-SM can't
  switch to that tab in the first place; this only happens if SM status was
  revoked mid-session, which the data model doesn't currently support.
- The parking-lot order is server insertion order. If the SM wants explicit
  ordering, that's a future enhancement.

## Related design files

- `tretro/project/screen-discussion.jsx` — original canvas
- `tretro/chats/chat2.md` — "Scrum Master Retro會議工具" intent capture
