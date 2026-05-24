# 2026-05-24 — Fix: cannot join room after stale session

## Summary
- Fix a bug where landing on `/room/{id}` with an obsolete `sessionToken` in
  sessionStorage would leave the user stranded on a half-rendered board
  whose header read `Loading… · Error · 0 present`. The socket connection
  silently failed with `Invalid session token` and there was no recovery
  path.
- Behaviour change: the board page now **always** round-trips the server on
  mount (`POST /api/rooms/{id}/participants`), passing the cached token if
  one exists. The server reuses the participant on a valid match, or mints
  a fresh one when the token is unknown / belongs to a different room.

## What changed
- New `src/lib/services/joinOrCreateParticipant.ts` centralises the
  reuse-vs-create decision.
- `src/app/api/rooms/[roomId]/participants/route.ts` becomes a thin adapter
  over the service; accepts an optional `sessionToken` in the body. Returns
  `200` on reuse, `201` on create.
- `src/app/room/[roomId]/page.tsx` drops the optimistic
  `if (sessionToken && roomId match) → ready` short-circuit and always
  calls the API.
- `src/__tests__/unit/services/joinOrCreateParticipant.test.ts` — 8 new
  unit tests covering: fresh create, valid reuse, stale token recovery,
  cross-room token recovery, 404, 410, missing-nickname-on-create, and
  nickname-not-required-on-reuse.

## Verification
- `npm test` → 10 suites / 113 tests pass.
- `npx tsc --noEmit` → 0 errors.
- `npx eslint` on the four touched files → 0 errors.
- Manual browser preview:
  - Happy path (clean sessionStorage) → board loads with `Live · 1 present`.
  - Stale token (`deadbeefcafe` UUID) → board *also* loads with
    `Live · 1 present`; sessionStorage token is silently rotated to the
    new participant's UUID. Before the fix this same state produced
    `Loading… · Error · 0 present`.
