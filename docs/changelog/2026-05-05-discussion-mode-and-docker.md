# 2026-05-05 — Scrum Master Discussion mode + Docker publish

## Summary

Implements the *Scrum Master discussion* flow from the Anthropic Design canvas
(`tretro/project/screen-discussion.jsx`). Adds a new Discussion tab visible only
to SMs that walks through cards grouped by tag with **anonymity-only display**,
sortable order, **per-card decisions** (➜ Action / ⏸ Park / ✓ Discussed), and a
parking lot for cards that need a deeper dive. Replaces the action-item
*Assignee dropdown* with a free-text **Owner** input. Ships a multi-stage
Dockerfile and the image is published to Docker Hub at
`kamimaki/tretro:latest` (and a versioned tag).

## What changed

### Feature: Discussion tab (SM-only)
- `src/components/discussion/DiscussionPanel.tsx` (new) — tag rail, group
  selector, sort selector, main queue with Action / Park / Discussed buttons,
  parking-lot side panel.
- `src/components/room/RoomBoard.tsx` — registers the tab + `D` shortcut +
  badge counter; only renders for `isScrumMaster`.

### Feature: Park / Unpark cards
- `is_parked` column on `cards` (idempotent migration).
- `cardRepo.setParked(id, isParked)`.
- Socket event `card:park`; only SMs can drive it. Re-broadcasts as
  `card:updated` so every client refreshes its board.
- `useRoom().setCardParked(cardId, isParked)`.
- Parked cards in the main Board view show a `⏸ parked` chip and fade to 0.6
  opacity so they don't compete for attention.

### Feature: Action item Owner is free-text
- `ActionItemForm` no longer accepts a `participants` prop or renders a
  `<select>`. The new field is a labelled `<input type="text">` for **Owner**.
- `ActionItemList` and `RoomBoard` updated to drop the `participants` plumbing.
- Schema is unchanged (`assignee` stays a string), so historical action items
  continue to render correctly.

### Build & deploy: Docker
- `Dockerfile` (new) — multi-stage `deps → build → runtime` based on
  `node:20-bookworm-slim`. Production image runs `npm start` which is
  `NODE_ENV=production tsx server.ts`. SQLite persists to `/data` via VOLUME
  with `DATABASE_PATH` env override. `HEALTHCHECK` polls `/api/health`.
- `.dockerignore` — excludes `.git`, `.next`, `node_modules`, `.omc`, `.claude`,
  test artefacts, docs, and editor noise.
- Image tagged `kamimaki/tretro:latest` and `kamimaki/tretro:v0.2.0`, pushed
  to Docker Hub.

### Tests
- New unit-test block for `cardRepo.setParked`: default state, round-trip,
  ghost-id no-op.
- Fixture updates in `dto.test.ts` and `export.test.ts` so they match the new
  required `CardDB.isParked` shape.

## Why

Two motivations:

1. **Live retro facilitation gap.** The existing Board view is good for async
   collection, but the live walkthrough needed grouping, anonymity-only mode,
   and a place to *defer* cards rather than fight to fit them in 60 seconds.
2. **Action-item ownership outside the team.** Real action items often go to
   people not in the room — vendors, "the platform team", "next on-call".
   The participant dropdown was actively in the way.

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm test` — 95/95 green (3 new park tests)
- `npx eslint . --quiet` — 0 errors
- `docker build .` — succeeds (multi-stage, ~7 min cold cache)
- `docker run -p 3000:3000 -v tretro-data:/data kamimaki/tretro:latest` —
  serves http://localhost:3000 returning 200 within 20s
- `docker push kamimaki/tretro:latest` — succeeds; verified pull from a
  separate machine

## Caveats

- Discussed marker is intentionally session-only. Reload = fresh slate.
- A non-SM cannot reach Discussion. If SM is revoked mid-session (not
  currently possible), the tab disappears on next render.
- Parking lot order is server insertion order; explicit drag-reorder is a
  follow-up.
