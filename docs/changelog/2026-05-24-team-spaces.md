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
