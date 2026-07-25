# Technical Reference: Team Login & Anonymous-Default (2026-07-25)

> Supersedes the auth-related parts of `docs/technical/team-spaces.md`'s
> "two-ring auth model" section (Ring 1 / daily password is gone — see
> that doc's 2026-07-25 update note). This doc covers only what changed in
> this batch; see `docs/technical/team-spaces.md` for the still-current
> team-scoping and vote-denominator design.

## What Changed

### Deleted
| Path | Was |
|---|---|
| `src/lib/utils/dailyPassword.ts` | `getDailyPassword`, `verifyPassword`, `msUntilTaipeiMidnight` — the `yyyymmdd` Taipei-date password |
| `src/app/api/auth/route.ts` | `POST /api/auth` (set cookie) / `DELETE /api/auth` (clear cookie) |
| `src/__tests__/unit/utils/dailyPassword.test.ts` | 10 unit tests for the above |
| `docs/technical/daily-password-gate.md`, `docs/usage/daily-password-gate.md` | Docs for the removed gate |

### Added
| Path | Role |
|---|---|
| `src/components/ui/PasswordField.tsx` | `<input type="password">` wrapper with a show/hide eye toggle |
| `src/components/ui/Switch.tsx` | Accessible `role="switch"` on/off control (track + thumb) |

### Modified
| Path | Change |
|---|---|
| `src/proxy.ts` | Dropped the daily-password branch. Now checks only for a `tretro-team` cookie; public paths are `/login`, `/api/teams*`, `/api/health` |
| `src/app/login/page.tsx` | Password form removed; renders `TeamPicker` directly, still resolves `?next=` via `safeNext()` |
| `src/components/team/TeamPicker.tsx` | Password `<input>` → `<PasswordField>` |
| `src/components/team/CreateTeamModal.tsx` | Both password `<input>`s → `<PasswordField>` |
| `src/components/room/RoomHeader.tsx` | `handleCopyLink` no longer appends `?password=...`; copies the bare room URL |
| `src/app/page.tsx` | New-room modal: `isAnonymous` state defaults to `true`; anonymous toggle is now `<Switch>` instead of a raw `<input type="checkbox">`; participant-count input relabelled "optional" |
| `src/app/api/rooms/route.ts` | Removed the `400` rejection for `isAnonymous: true` with no/zero `participantCount` |
| `src/app/globals.css` | Removed the `.toggle` CSS primitive (dead code — it had zero consumers even before this batch; see Caveats) |
| `playwright.config.ts`, `src/__tests__/e2e/global-setup.ts` | Read `E2E_PORT` (falls back to `3000`) instead of a hardcoded port |
| `src/__tests__/integration/api/rooms.test.ts` | Asserts anonymous rooms with no/zero `participantCount` now return `201` with `participantCount: null`, not `400` |
| `docs/usage/docker.md`, `docs/usage/team-spaces.md`, `deploy/README.md` | Login instructions rewritten for team-only login |
| `docs/technical/team-spaces.md` | Section "The two-ring auth model" retitled to note Ring 1's removal, plus a correction paragraph pointing at this doc (29 lines) |

## Why

**Why remove the daily-password ring entirely, not just de-emphasize it?**
It was an anonymous, instance-wide, calendar-derived password that rotated
for every team at once. Once team spaces existed, every board was already
gated by a per-team password (`requireTeamId()` in every room-scoped API
route, the Socket.IO handshake). The daily password stopped adding
isolation the day team spaces shipped — it only added a second cookie and a
"what's today's password" support question. Removing it collapses the app
back to one login step.

**Why default `isAnonymous` to `true`, and why does that force the
participant-count change?** Anonymous feedback produces more candid retro
input, so it's the better default for most teams. But the *old*
participant-count rule ("anonymous rooms must declare a positive headcount
before creation") was written when anonymous was an opt-in checkbox — a
minority of rooms hit it. Making anonymous the default would have made that
mandatory field pop up on essentially every "New retro" click, turning a
one-field form (just the title) into a two-field form for the common case.
Dropping the requirement and letting `resolveVoteDenominator()`
(`src/lib/utils/voteDenominator.ts`, unchanged by this batch) fall back to
the live connected-participant count keeps room creation fast. The
trade-off this introduces is real and is called out below in Caveats — it
was accepted deliberately, not overlooked.

**Why a dedicated `PasswordField` and `Switch` instead of inline markup?**
Both patterns (masked-input-with-reveal, accessible on/off toggle) were
duplicated or missing across `TeamPicker` / `CreateTeamModal` / the new-room
modal. Centralizing them means the letter-spacing-while-masked behavior and
the `role="switch"` semantics only need to be correct in one place.

## How It Works

### Auth flow, end to end

```
Browser request (any path)
   │
   ▼
src/proxy.ts  (Next.js 16 "proxy" — the route-guard file that replaced
               the legacy middleware.ts convention)
   │
   ├─ pathname is /login, /api/teams*, or /api/health?
   │     └─ yes → NextResponse.next()  (public, no cookie check)
   │
   ├─ tretro-team cookie present?
   │     ├─ yes → NextResponse.next()   (cheap presence check only —
   │     │         proxy never touches the DB or validates the value)
   │     └─ no  → pathname starts with /api/ ?
   │                ├─ yes → 401 JSON { error: 'Unauthorized' }
   │                └─ no  → redirect to /login?next=<original path>
   │                (except when the original path is exactly `/` — the
   │                `next` param is omitted there, so it's a bare
   │                redirect to `/login`; see `src/proxy.ts:49`)
   │
   ▼ (request reaches the app)
src/app/login/page.tsx
   │  reads ?next= via safeNext() (same-origin only, rejects //host and
   │  /login itself to prevent open redirects / redirect loops)
   │  renders <TeamPicker onAuthed={...}>
   ▼
src/components/team/TeamPicker.tsx
   │  lists teams (GET /api/teams), user picks one + types password
   │  (masked through <PasswordField>)
   │  POST /api/teams/auth { teamId, password }
   ▼
/api/teams/auth route
   │  verifies password (scrypt), sets tretro-team cookie (30-day maxAge)
   ▼
onAuthed() → router.replace(next) → router.refresh()
   │  the now-present tretro-team cookie lets the retried request
   │  through src/proxy.ts on the next navigation
   ▼
Downstream real authorization (proxy does NONE of this):
   ├─ API routes: requireTeamId(request) — src/lib/utils/teamAuth.ts
   │    reads tretro-team cookie → teamRepo.findById() → 403 + clears
   │    the cookie if the team no longer exists, otherwise { teamId }
   └─ Socket.IO handshake: authMiddleware — src/lib/socket/middleware.ts
        sessionToken + roomId → participant lookup → tretro-team cookie
        on the handshake → room.teamId must match → reject otherwise
```

The key point: **the proxy layer only checks that a `tretro-team` cookie
exists.** It does not decode it, does not check it against the database,
and does not know which team it belongs to. All of that happens downstream,
per-request, in `requireTeamId()` and in the socket handshake — both
unchanged by this batch.

### Anonymous-default room creation

```
app/page.tsx  NewRoomModal
   isAnonymous state initialized to true (was: false)
   │
   ▼ user submits
POST /api/rooms { name, templateId, participantCount, isAnonymous }
   │
   ▼
src/app/api/rooms/route.ts
   participantCount: parsed only if provided and > 0, else null
   (no longer rejects isAnonymous:true + no/zero participantCount)
   │
   ▼
roomRepo.create(name, templateId, teamId, participantCount, isAnonymous)
   room.participantCount may be null in the DB

Later, at vote time:
resolveVoteDenominator(room, sessionParticipantCount)
   room.participantCount > 0 ?  → use it (facilitator-declared, exact)
   else                          → use max(live connected-participant count, 1)
                                   (floor so the denominator is never 0)
```

## Usage

### `PasswordField`

Drop-in replacement for a raw `<input type="password">`. It forwards all
other `<input>` props to the `<input>` element itself — **except `style`**,
which is destructured out and applied to the wrapper `<div>` instead
(`src/components/ui/PasswordField.tsx:12,18`); the input's own style is
hardcoded. This is deliberate: the eye button is absolutely positioned
against the wrapper, so any layout spacing (e.g. `marginBottom`) has to
live on the wrapper or the button loses its vertical centring relative to
the input. Call sites rely on this — e.g. `CreateTeamModal.tsx` passes
`style={{ marginBottom: 14 }}` expecting wrapper spacing, not input
spacing.

```tsx
import { PasswordField } from '@/components/ui/PasswordField';

<PasswordField
  id="team-password"
  autoComplete="current-password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="••••••••"
  disabled={submitting}
/>
```

The component owns its own `visible` state — you don't pass or control it.
Masked text renders with `letterSpacing: '0.12em'`; revealed text renders
with normal spacing (wide spacing on real characters reads oddly).

### `Switch`

Controlled on/off toggle, `role="switch"`.

```tsx
import { Switch } from '@/components/ui/Switch';

<Switch
  id="anonymousMode"
  checked={isAnonymous}
  onChange={setIsAnonymous}
  aria-label="Anonymous mode"
/>
```

`checked` and `onChange` are required; `disabled`, `id`, `label`
(rendered inline next to the track), and `aria-label` are optional. It
reduces its transition to `0.01ms` under `prefers-reduced-motion: reduce`.

## Caveats

- **Participant-count fallback can over-count.** When a room has no
  declared `participantCount`, `resolveVoteDenominator()` falls back to
  the number of currently-connected participant rows. Every browser tab —
  a phone next to a laptop, a stale tab left open, a page refresh that
  doesn't clean up the old session fast enough — mints its own
  `Guest-XXX` participant row. That inflates the denominator, which can
  make consensus percentages look lower than the room's actual agreement.
  **Facilitators who need exact consensus ratios should still declare a
  participant count explicitly** at room-creation time; the default is a
  convenience trade-off, not a precision guarantee. This is the single
  most important caveat in this document.
- **Room pages are guarded only by cookie *presence* at the proxy layer.**
  `src/proxy.ts` does not verify that the `tretro-team` cookie value maps
  to a real team — a forged or stale cookie value still passes the proxy
  check. Every route that actually returns team-scoped data re-verifies
  through `requireTeamId()` (DB lookup, 403 + cookie-clear on a dangling
  team ID), and Socket.IO independently re-verifies through
  `authMiddleware`. If you add a new page or API route, do not assume the
  proxy already authenticated the request — call `requireTeamId()` (or
  the socket equivalent) yourself.
- **`resolveVoteDenominator()` itself did not change** in this batch — only
  the API-level rule that used to force a positive `participantCount` for
  anonymous rooms was removed. The denominator logic and its priority
  order are documented in `docs/technical/team-spaces.md`.
- **The Playwright suite must be run with a free port.** `E2E_PORT=3100`
  was used for this batch (27/27 passed); the default 3000 is occupied on
  the maintainer's machine by an unrelated container, and
  `reuseExistingServer` will silently attach to it. Full evidence is in
  the companion changelog's Verification section.
- **The `.toggle` CSS primitive was dead code before this batch removed
  it** — grep confirmed no remaining references — so its removal has no
  runtime effect beyond a smaller `globals.css`.
