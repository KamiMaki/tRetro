# 2026-07-25 — Team login replaces daily-password gate; anonymous mode is now the default

## Summary

Removes the second auth ring (the daily-rotating Taipei-date password) entirely.
`src/proxy.ts` now gates on presence of the `tretro-team` cookie alone; real
authorization still happens where it already did — `requireTeamId()` in the
API routes and the Socket.IO handshake. Password fields across the app gained
a show/hide eye toggle, the anonymous/named room choice became an accessible
switch that now **defaults to anonymous**, and participant count is no longer
required to create an anonymous room. The E2E port is also overridable so a
local Playwright run can't silently attach to an unrelated app already
listening on 3000.

## What changed

### Deleted
- `src/lib/utils/dailyPassword.ts` — the `yyyymmdd` Taipei-date password
  generator/verifier.
- `src/app/api/auth/route.ts` — `POST /api/auth` / `DELETE /api/auth`.
- `src/__tests__/unit/utils/dailyPassword.test.ts`.
- `docs/technical/daily-password-gate.md`, `docs/usage/daily-password-gate.md`
  — superseded by this doc set.

### New
- `src/components/ui/PasswordField.tsx` — password `<input>` with a show/hide
  eye toggle. Masked text keeps the app's wide `letter-spacing`; revealed
  plain text drops it.
- `src/components/ui/Switch.tsx` — accessible `role="switch"` control (track
  + thumb), honours `prefers-reduced-motion`.

### Modified
- `src/proxy.ts` — dropped the daily-password check. Now a cheap presence
  check on the `tretro-team` cookie; public bypasses are `/login`,
  `/api/teams*`, and `/api/health`.
- `src/app/login/page.tsx` — trimmed down to render `TeamPicker` directly
  (the password form is gone); still honours `?next=` via a `safeNext()`
  same-origin guard.
- `src/components/team/TeamPicker.tsx`, `src/components/team/CreateTeamModal.tsx`
  — team/confirm password fields now use `PasswordField`.
- `src/components/room/RoomHeader.tsx` — "Copy link" no longer appends a
  daily password to the shared URL; it copies the plain room URL.
- `src/app/page.tsx` — new-room modal uses `Switch` for anonymous mode;
  `isAnonymous` now **defaults to `true`**; participant count is labelled
  optional and no longer blocks submission for anonymous rooms.
- `src/app/api/rooms/route.ts` — dropped the server-side rule requiring a
  positive `participantCount` when `isAnonymous` is true.
- `src/app/globals.css` — removed the unused `.toggle` primitive (dead code
  since `Switch` replaced it).
- `playwright.config.ts`, `src/__tests__/e2e/global-setup.ts` — both now read
  `E2E_PORT` (default `3000`) instead of hardcoding the port.
- `src/__tests__/integration/api/rooms.test.ts` — updated to assert that
  anonymous rooms with no/zero `participantCount` are now accepted (`201`,
  `participantCount: null`) instead of rejected (`400`).
- `docs/usage/docker.md`, `docs/usage/team-spaces.md`, `deploy/README.md` —
  login instructions updated to describe team login only.
- `docs/technical/team-spaces.md` — "The two-ring auth model" section
  retitled to note Ring 1's removal, plus a correction paragraph pointing
  at the technical doc in this batch (29 lines).

## Why

- **One auth ring was enough friction, and it was the wrong kind.** The
  daily password rotated for everyone regardless of team, so it protected
  nothing that the team password didn't already protect, while adding a
  second thing to remember and a second cookie to reason about. The team
  cookie already gates every board and every API route.
- **Anonymous-by-default made participant count mandatory on every single
  room, not just the ones that wanted it.** The old rule ("anonymous rooms
  require a positive `participantCount`") was fine when anonymous was an
  opt-in checkbox. Once anonymous became the default, that rule turned an
  optional field into a mandatory one for the common case. Dropping the
  requirement and falling back to the live connected-participant count via
  `resolveVoteDenominator()` keeps room creation a one-field form
  (`name`) again — see the Caveats section in the technical doc for the
  accuracy trade-off this introduces.
- **Show/hide toggles and a real switch component are table stakes** for a
  password field and a binary on/off choice; both were missing before.

## Verification

- `npx tsc --noEmit` — exit 0.
- `npm test` (jest) — `Test Suites: 28 passed, 28 total` / `Tests: 276
  passed, 276 total`, including the updated `rooms.test.ts`
  anonymous-room-without-count cases.
- `npm run build` — exit 0.
- `set E2E_PORT=3100 && npx playwright test` — `27 passed (2.3m)`.
- Manual browser verification, server bound to port 3100 against
  `data/test-e2e.db`:
  - Unauthenticated `/` returns `307` → `/login`.
  - The eye toggle flips the password input between `type=password`
    (letter-spacing `1.68px`) and `type=text` (letter-spacing `normal`),
    with `aria-label` switching between Show/Hide.
  - The eye button's vertical centre matches the input's exactly
    (`deltaY = 0` via `getBoundingClientRect`).
  - The new-room modal shows `role="switch"` with `aria-checked="true"`,
    label "Participant count (optional)", and an enabled Create button
    with the count left blank.
  - A room created that way accepted an anonymous card comment, which was
    then edited in place, showing the new text and the `已編輯` marker.

## Caveats

- See `docs/technical/team-login-and-anonymous-default.md` for the full
  Caveats section, including the participant-count over-count risk and the
  fact that room pages are guarded only by cookie *presence* at the proxy
  layer (real authorization is downstream).
