# 2026-05-24 — Team Spaces (multi-tenancy)

Tracking changelog for the multi-PR team-spaces feature. Each entry corresponds
to one merged PR from the approved plan at [`.omc/plans/team-spaces-plan.md`].

---

## PR 1 — Schema migration + team CRUD foundation

**Goal.** Add the database tables, columns, and pure utility layer that the
later PRs build on. No user-visible behavior changes yet.

**What changed**

- `src/lib/db/schema.ts`
  - New `teams` table (`id`, `name UNIQUE`, `password_hash`, `password_salt`,
    `created_at`).
  - `rooms` gains `team_id` (nullable FK to `teams.id` with `ON DELETE
    CASCADE`), `participant_count` (nullable integer), `is_anonymous`
    (integer default 0).
  - New `idx_rooms_team` index.
- `src/lib/db/migrations.ts`
  - Idempotent `PRAGMA table_info(rooms)`-guarded `ALTER TABLE` calls for
    the three new columns, plus `CREATE INDEX IF NOT EXISTS`. Re-running on
    a fully-migrated DB is a no-op.
- `src/lib/utils/teamPassword.ts` (new)
  - `hashTeamPassword(plain)` → `{ hash, salt }` using `crypto.scrypt`
    with `N=16384, r=8, p=1` (Node defaults; ~50–100 ms per call). Returns
    lowercase hex (128-char hash, 32-char salt).
  - `verifyTeamPassword(plain, hash, salt)` using `timingSafeEqual`. Returns
    `false` (not throws) for malformed inputs.
- `src/lib/utils/teamAuth.ts` (new)
  - `TEAM_COOKIE_NAME = 'tretro-team'`, `TEAM_COOKIE_MAX_AGE = 30 days`.
  - `getTeamIdFromRequest(request)` — defensive cookie parser with
    percent-decoding.
  - `requireTeamId(request)` — returns a discriminated union
    `{ teamId } | { error: NextResponse }`. When the cookie references a
    deleted team (Pre-Mortem Scenario 5), the error response clears the
    stale cookie via `Set-Cookie maxAge=0`.
- `src/lib/db/repositories/team.repo.ts` (new)
  - `create(name, password)` (async — hashes), `findById`, `findByName`,
    `findAll` (ordered by name), `verifyPassword(teamId, plain)` (async),
    `delete(id)` (CASCADE wipes the team's rooms).
- `src/lib/types/index.ts`
  - `Room` gains `teamId: string | null`, `participantCount: number | null`,
    `isAnonymous: boolean`.
  - New public `Team` interface — never includes password material.
- `src/lib/db/repositories/room.repo.ts`
  - `RoomRow` and `toRoom()` now map the three new columns (defaults
    `null / null / false` for legacy rows).

**Tests added**

- `src/__tests__/unit/utils/teamPassword.test.ts` (5 cases)
- `src/__tests__/unit/utils/teamAuth.test.ts` (9 cases)
- `src/__tests__/unit/repositories/team.repo.test.ts` (17 cases including
  CASCADE-on-delete via `team_id`)

**Verification**

- `npx jest --testPathPatterns=team` → 3 suites / 31 tests pass.
- `npm test` → 13 suites / **144 tests pass** (was 113 — +31 net, no
  regressions).
- `npx tsc --noEmit` → 0 errors.

**Quirks worth knowing**

- Node 20 `crypto.scrypt`: `promisify(scrypt)` drops the options-accepting
  overload, so we wrap manually to pass `N=16384, r=8, p=1` explicitly.
- Next.js 16 writes `.next/dev/types/validator.ts` from its dev server;
  stale copies can pollute `tsc --noEmit`. Wipe `.next` before relying on
  a clean type-check.

---

## PR 2 — Team API routes + auth + /me + rate limit

Wires the HTTP surface for team creation, authentication and identity
lookup. No proxy modification — team routes pass through after Ring 1
(verified by git diff). Commit `67c84b9`.

- `POST /api/teams` create (201 / 409 dup / 400 bad input)
- `GET /api/teams` list (id + name + createdAt; never passwords)
- `POST /api/teams/auth` verifies scrypt, sets 30-day `tretro-team`
  cookie, rate-limited per IP (5 fails / 60s → 5-min 429 with
  `Retry-After`); success resets the counter
- `DELETE /api/teams/auth` clears the cookie (Ring 1 untouched)
- `GET /api/teams/me` returns the current team or 403 + cleared cookie
- `src/lib/utils/rateLimit.ts` (new) — injectable-now() `RateLimiter`
  + `teamAuthLimiter` singleton + `getClientIp`
- 24 new tests (9 unit limiter + 15 integration route); suite 168/168

## PR 3 — Dashboard team picker + create-team modal + header

UI on top of the team API. Dashboard now gates on `tretro-team` before
any room fetch. Commit `57b3b39`.

- `TeamPicker.tsx` — team dropdown + password + “Forgot password?”
  help + “Create new team” CTA, Aurora/GlassPanel styled
- `CreateTeamModal.tsx` — form with name + password + confirm,
  prominent “no recovery” warning, auto-auths after create
- `src/app/page.tsx` — `TeamState` machine (`'loading'` | `'no-team'`
  | `TeamInfo`); team chip in header (name + switch button);
  `NewRoomModal` grows `participantCount` + `isAnonymous` inputs with
  client-side validation
- `src/app/trends/page.tsx` — title becomes “Trends for [Team Name]”
- **Bugfix found during browser verification**: `idx_rooms_team` was
  in `CREATE_TABLES_SQL` and ran *before* the `team_id` ALTER on
  existing DBs. Moved to `migrations.ts` after the column add.
- Browser-verified end-to-end: visit `/` → team picker → create
  “Aurora Team” → auto-auth → dashboard with team chip

## PR 4 — Room repo team scoping + per-room settings

Locks down every room-touching API route with `requireTeamId`, splits
the listing into team-owned vs. unclaimed, accepts per-room settings.
Commit `3afae13`.

- `roomRepo.findByTeamId(teamId)` + `findUnclaimed()` on a shared
  `SUMMARY_SELECT`; `findAll` kept for existing tests
- `roomRepo.create(name, templateId, teamId?, participantCount?,
  isAnonymous?)`
- `RoomSummary` gains `sessionParticipantCount +
  configuredParticipantCount`; legacy `participantCount` kept as
  compat alias (Fix B per plan §6.5) — dashboard “people” stat keeps
  rendering unchanged
- 6 routes verify team: GET/DELETE `/api/rooms/:id`, `*/export`,
  `*/history`, `*/webhook` (double-auth with `x-session-token`),
  `*/participants` (403 cross-team + 409 unclaimed)
- `POST /api/rooms` validates anonymous=true requires positive
  participantCount (400 otherwise)
- 17 new integration tests cover every shape; suite 185/185

## PR 5 — Vote denominator fix

Switches every consensus call site to `resolveVoteDenominator(room,
sessionCount)` so anonymous and configured rooms stop over-counting.
Commit `9b2b7ed`.

- `src/lib/utils/voteDenominator.ts` (new): priority chain
  `room.participantCount > 0` → that; else `max(sessionCount, 1)`
- 5 modified call sites: `RoomBoard.tsx` (room?.{} for null safety),
  export route (HTML/AI/Markdown consolidated into one `denom`),
  history route
- `Card.tsx` + `csvExport.ts` UNCHANGED (Card receives prop; CSV does
  not use participant count for vote math)
- 9 unit tests cover null / 0 / negative / both-zero / precedence;
  suite 194/194

## PR 6 — Legacy claim flow + unclaimed enforcement

Adoption path for pre-team rooms with a race-safe atomic UPDATE.
Commit `05293d1`.

- `roomRepo.claim(roomId, teamId)` —
  `UPDATE … WHERE id = ? AND team_id IS NULL`; concurrent claims see
  exactly one winner
- `POST /api/rooms/:id/claim` — 200/403/404/409 with audit log line
- `GET /api/rooms/unclaimed` — lists `team_id IS NULL` rows
- Dashboard parallel-fetches both lists; new `UnclaimedGrid` with
  amber chip + “Claim to {teamName}” CTA
- `POST /api/rooms/:id/participants` 409 on unclaimed already shipped
  in PR-4, completing the server-side read-only enforcement
- 9 new tests (3 repo + 6 route); suite 203/203

## PR 7 — Socket middleware team verification

Closes the remaining handshake loophole: a session token for a team B
room no longer lets a team A user connect. Commit `411ce01`.

- `parseTeamIdFromCookieHeader` extracted from teamAuth so both the
  Request helper and Socket.io handshake reuse it
- Middleware now runs six checks: sessionToken/roomId, participant
  exists, participant belongs to room, team cookie present, room not
  unclaimed, room.teamId matches cookie
- `SocketData` gains `teamId`
- 7 new unit tests cover every rejection path + happy path;
  suite 210/210

## PR 8 — Metrics scoping per team

Locks `/api/metrics/history` and the repo to the requesting team’s
rooms. Cross-team leakage is prevented at the SQL layer (CTE filter),
not just at the route. Commit `2ac5b68`.

- `metricRepo.getTeamHistory(limit, teamId)` — `WHERE team_id = ?` in
  the recent-rooms CTE; teamId now required
- `/api/metrics/history` calls `requireTeamId`; passes teamId through
- 4 new integration tests: 403 without cookie, scope per-team,
  excludes unclaimed, limit honoured; suite 214/214

## PR 9 — Documentation + Playwright globalSetup

Closes the feature with the operator-facing docs.

- `docs/technical/team-spaces.md` — architecture, schema, auth flow,
  caveats, test surface, change checklist
- `docs/usage/team-spaces.md` — user-facing how-to with no-recovery
  warning, anonymous semantics table, FAQ
- `playwright.config.ts` globalSetup now seeds Ring 2: lookup or
  create `e2e-team` (password `e2e-test-pass`), authenticate, persist
  both cookies in `playwright/.auth/user.json`. Idempotent across
  runs against the persistent `data/test-e2e.db`.

**Cumulative test surface:** 113 → **214 jest tests (+101)** across
20 suites. `npm test` clean; `npx tsc --noEmit` clean.
