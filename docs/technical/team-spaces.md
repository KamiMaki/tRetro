# Team Spaces — Technical Reference

> Date shipped: 2026-05-24
> Scope: 9 PRs (`cb22203` → `2ac5b68`, plus the final docs/setup PR)
> Plan of record: `.omc/plans/team-spaces-plan.md` (Architect + Critic APPROVED iteration 1)

This document is the canonical reference for how multi-tenancy works in
RetroXpert. It is meant for an engineer reading the code cold: enough
detail to understand the invariants, debug an issue, and extend the
feature without breaking isolation.

---

## 1. What changed

### New tables / columns

```
teams (id PK, name UNIQUE, password_hash, password_salt, created_at)

rooms (existing) gains:
  team_id           TEXT REFERENCES teams(id) ON DELETE CASCADE (nullable — NULL = unclaimed)
  participant_count INTEGER (nullable — configured headcount for vote denominator)
  is_anonymous      INTEGER NOT NULL DEFAULT 0
INDEX idx_rooms_team ON rooms(team_id)
```

All `rooms` additions are idempotent ALTERs guarded by
`PRAGMA table_info(rooms)`. The `idx_rooms_team` index is created in
`migrations.ts` **after** the ALTER runs (NOT in `CREATE_TABLES_SQL`)
because an existing rooms table predates the column and would error.

### New files

| Path | Role |
|---|---|
| `src/lib/utils/teamPassword.ts` | scrypt hash + verify (N=16384, r=8, p=1) |
| `src/lib/utils/teamAuth.ts` | `requireTeamId`, cookie helpers, `parseTeamIdFromCookieHeader` |
| `src/lib/utils/voteDenominator.ts` | `resolveVoteDenominator(room, sessionCount)` |
| `src/lib/utils/rateLimit.ts` | In-memory `RateLimiter` + `teamAuthLimiter` singleton |
| `src/lib/db/repositories/team.repo.ts` | Team CRUD (async create/verifyPassword) |
| `src/app/api/teams/route.ts` | `GET` (list) / `POST` (create) |
| `src/app/api/teams/auth/route.ts` | `POST` (login) / `DELETE` (logout) |
| `src/app/api/teams/me/route.ts` | `GET` current team metadata |
| `src/app/api/rooms/[roomId]/claim/route.ts` | `POST` claim an unclaimed room |
| `src/app/api/rooms/unclaimed/route.ts` | `GET` list legacy rooms |
| `src/components/team/CreateTeamModal.tsx` | New-team form |
| `src/components/team/TeamPicker.tsx` | Picker shown when no team cookie |

### Modified files (highlights)

- `src/lib/db/schema.ts` / `src/lib/db/migrations.ts` — schema additions
- `src/lib/db/repositories/room.repo.ts` — `findByTeamId`, `findUnclaimed`, `claim`, `create` gains 3 params, `toRoom` + `toSummary` map new fields
- `src/lib/db/repositories/metric.repo.ts` — `getTeamHistory(limit, teamId)` scoped by `team_id`
- `src/lib/types/index.ts` — `Room` gains `teamId / participantCount / isAnonymous`; `RoomSummary` gains `sessionParticipantCount + configuredParticipantCount`; legacy `participantCount` kept as compat alias mapped to session count
- All 6 room-touching API routes (`/api/rooms` GET+POST, `/api/rooms/:id` GET+DELETE, `*/export`, `*/history`, `*/webhook`, `*/participants`) call `requireTeamId`
- `src/lib/socket/middleware.ts` — three new handshake stages: team cookie present, room not unclaimed, room.teamId matches cookie
- `src/app/page.tsx` — Team picker gate before any room fetch; team chip in header; NewRoomModal grows participantCount + isAnonymous inputs; UnclaimedGrid section + claim button
- `src/app/trends/page.tsx` — Title becomes “Trends for [Team Name]”
- `src/components/room/RoomBoard.tsx` — passes `resolveVoteDenominator(room, participants.length)` instead of raw `participants.length`

### NOT modified (deliberate)

- `src/proxy.ts` — Ring 1 only; Edge runtime can’t reach SQLite, so team checks live in API routes
- `src/components/board/Card.tsx` — receives the resolved value as a prop
- `src/lib/utils/csvExport.ts` — does not use participant count for vote math

---

## 2. Why this design

### The two-ring auth model

```
┌────────────────────────────────────────────────────────┐
│ Ring 1: daily yyyymmdd password (Asia/Taipei)         │  src/proxy.ts (unchanged)
│ Cookie: tretro-auth   Lifetime: until next midnight   │
└────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ Ring 2: per-team password (scrypt-hashed)             │  src/lib/utils/teamAuth.ts
│ Cookie: tretro-team   Lifetime: 30 days               │
│ Verified by requireTeamId() — DB existence check +    │
│ stale-cookie auto-clear when team has been deleted    │
└────────────────────────────────────────────────────────┘
            │
            ▼
   API routes, repos, socket handlers
```

Why two cookies instead of one? Three reasons:

1. **Daily rotation vs. long-lived teams.** Ring 1 rotates nightly so
   shared screenshots expire; teams should not have to re-auth daily.
2. **Edge runtime can’t see SQLite.** Ring 1 runs in proxy / Edge
   context. Ring 2 needs a DB lookup, which only works inside Node API
   routes.
3. **Separation of concerns.** Each cookie has one job; future changes
   to one ring don’t risk breaking the other.

### Why `team_id` is nullable

Existing rooms from before this feature have `team_id IS NULL`. Making
the column non-null would require either dropping all data (no) or
creating a synthetic “legacy” team (Architect rejected: any user who
guesses the synthetic team id would bypass isolation). Nullable FK +
explicit claim flow keeps legacy data accessible without a backdoor.

### Why vote denominator changed

Anonymous mode mints a fresh `Guest-XXX` participant row per browser
tab. The old denominator (`participants.length`) over-counted, so vote
ratios on anonymous rooms were always wrong. The new helper prefers the
facilitator-configured `participantCount`; falls back to the session
count only on legacy rooms with no configured value; floors at 1 to
avoid div-by-zero.

---

## 3. How it works

### Claim flow (race-safe)

```sql
-- atomic; concurrent claims see exactly one winner
UPDATE rooms
   SET team_id = ?, updated_at = datetime('now')
 WHERE id = ?
   AND team_id IS NULL
```

`roomRepo.claim()` returns `info.changes > 0`. The route then re-loads
the room and returns it. A second claim on the same room sees
`changes === 0` and the route returns 409.

### `requireTeamId()` discriminated union

```ts
type RequireTeamResult = { teamId: string } | { error: NextResponse };

const gate = requireTeamId(request);
if ('error' in gate) return gate.error;
// gate.teamId is narrowed to string here
```

Three failure modes, all collapsed to 403:
- no `tretro-team` cookie → `{ error: 'No team selected' }`
- cookie present but `teamRepo.findById()` returns null → `{ error: 'Team not found' }` + `Set-Cookie` clearing the stale cookie
- cookie present but URL-decode failure → null treated as missing

### Socket handshake

```
[handshake] sessionToken + roomId (auth) + cookie (headers)
   │
   ├─ participantRepo.findBySessionToken → reject if missing
   ├─ participant.roomId === roomId       → reject if mismatch
   ├─ parseTeamIdFromCookieHeader         → reject if missing
   ├─ roomRepo.findById(roomId)           → reject if missing
   ├─ room.teamId !== null                → reject if unclaimed
   └─ room.teamId === teamCookie          → reject if cross-team
```

`socket.data.teamId` is populated for downstream handlers, though no
handler currently uses it (the room scope is already established at
handshake time).

### Vote denominator priority chain

```ts
resolveVoteDenominator(room, sessionCount)
  // 1. configured headcount when positive
  if (room.participantCount > 0) return room.participantCount;
  // 2. legacy fallback (session row count)
  return Math.max(sessionCount, 1);
```

Anonymous rooms force the API to require `participantCount > 0` at
creation time so the fallback never kicks in for them.

### Rate-limiting failed team logins

`teamAuthLimiter` in `src/lib/utils/rateLimit.ts` is an in-memory
`Map<ip, state>`. Five failed attempts in 60s → 5-minute 429 with a
`Retry-After` header. Successful auth wipes the counter. State resets
on process restart — acceptable for the current low-traffic
deployment; persist to SQLite if bypass becomes a real concern.

---

## 4. Caveats & known limitations

- **No password recovery.** Lose the team password and the only escape
  is direct DB intervention. Documented in `docs/usage/team-spaces.md`.
  Future work: admin CLI command.
- **Unclaimed rooms are readable by any authenticated user.** They have
  to be discoverable so somebody can claim them. The participants
  route, the socket middleware, and PR-4 GET checks all enforce that
  joining is blocked until a claim happens.
- **Team membership is password-only.** No per-user identity, no roles,
  no audit trail of who-did-what. Matches the existing “anonymous
  insider” trust model.
- **`RoomSummary.participantCount` is still the session count.** Kept
  as a compat alias so the dashboard “people” stat keeps rendering. A
  follow-up will migrate consumers to `sessionParticipantCount` /
  `configuredParticipantCount` explicitly and remove the alias.
- **In-memory rate limiter is per-process.** A multi-process deployment
  would not share the counter; sliding into the limit needs persistent
  storage for that case.
- **Webhook auth is doubly gated.** PUT /api/rooms/:id/webhook requires
  BOTH the team cookie AND an `x-session-token` header for a
  participant of that room. Either fails → reject.

---

## 5. Test surface

214 tests pass after PR-8, up from 113 before this feature shipped:

| Layer | Count | Files |
|---|---|---|
| Unit — password / auth / vote / rate | 5+9+9+9 = 32 | `__tests__/unit/utils/{teamPassword,teamAuth,voteDenominator,rateLimit}.test.ts` |
| Unit — repos | 17 | `__tests__/unit/repositories/team.repo.test.ts` |
| Unit — socket middleware | 7 | `__tests__/unit/socket/middleware.test.ts` |
| Integration — teams API | 15 | `__tests__/integration/api/teams.test.ts` |
| Integration — rooms API + cross-team | 17 | `__tests__/integration/api/rooms.test.ts` |
| Integration — claim + unclaimed | 9 | `__tests__/integration/api/claim.test.ts` |
| Integration — metrics scoping | 4 | `__tests__/integration/api/metrics-history.test.ts` |

`npm test` from a clean checkout runs all of them. Add `npm run test:e2e`
once Playwright is wired with the team-aware globalSetup (PR-9).

---

## 6. Where to make changes

| If you want to … | Touch this first |
|---|---|
| Add per-team settings (e.g., default template) | `teams` table → `team.repo` → `/api/teams/me` payload → consumers |
| Allow team rename | New `PUT /api/teams/:id` route; pre-check name uniqueness (catch unique-violation as 409) |
| Add team deletion UI | New `DELETE /api/teams/:id` (admin-gated?); CASCADE handles room cleanup |
| Add password reset | CLI script in `scripts/` that calls `teamRepo` directly with a new scrypt hash; document operator flow |
| Tune scrypt cost | `SCRYPT_OPTIONS` in `teamPassword.ts`; raise N for security or lower for hardware constraints |
| Persist rate limit | Add a `rate_limit_events` table; swap the in-memory `Map` for a DB-backed one |

---

## 7. Audit log entries

When changing any of the following, also update this technical doc:

- The auth ring model (Ring 1 / Ring 2 boundary)
- Cookie names or lifetimes
- The vote denominator priority chain
- The claim flow’s atomic UPDATE semantics
- The list of routes that call `requireTeamId`
