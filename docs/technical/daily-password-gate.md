# Technical: daily-password gate

## What changed

### New files
- `src/lib/utils/dailyPassword.ts` — pure utility, Edge-runtime safe.
  - `getDailyPassword(now?: Date): string` — `yyyymmdd` in Taipei tz.
  - `verifyPassword(input: unknown, now?: Date): boolean` —
    constant-time-ish equality.
  - `msUntilTaipeiMidnight(now?: Date): number` — used to cap the
    auth-cookie `maxAge`.
  - Re-exports the two magic strings: `AUTH_COOKIE_NAME = 'tretro-auth'`
    and `PASSWORD_QUERY_PARAM = 'password'`.
- `src/proxy.ts` — Next.js 16 Edge proxy (formerly "middleware"). Gates every page and
  API call except `/login`, `/api/auth`, `/api/health`, and static
  assets (handled via the `matcher` regex).
- `src/app/api/auth/route.ts` — `POST` validates the password and sets
  the cookie; `DELETE` clears it.
- `src/app/login/page.tsx` — login form, wraps `useSearchParams()` in
  `Suspense`.
- `src/__tests__/unit/utils/dailyPassword.test.ts` — 10 tests.
- `src/__tests__/e2e/global-setup.ts` — Playwright global setup that
  authenticates once and persists `storageState`.

### Modified files
- `playwright.config.ts` — registers `globalSetup` and the
  `storageState` path so E2E tests start past the gate.
- `.gitignore` — ignores `playwright/.auth/`.
- `src/app/page.tsx` — wraps `useSearchParams()` in `Suspense` so the
  build can statically prerender the dashboard shell.

## Why we built it this way

### Why "today's date" as the password?

We wanted access control without identity. Other options we ruled out:

| Option | Rejected because |
|---|---|
| Single static admin password | Leaks once, leaks forever; no rotation. |
| Time-based one-time codes (TOTP) | Requires per-user enrolment, defeats anonymity. |
| OAuth / SSO | Requires accounts, defeats anonymity. |
| Random daily password emailed to a list | Requires a list to email. |
| **Today's date (Taipei) as `yyyymmdd`** | Zero infra, zero coordination, auto-rotates, share-link friendly. |

The cost is that the password is **publicly derivable**. We are
explicit about this in the changelog and usage docs: the gate is a
"buzz me up at the door" filter, not authentication.

### Why a daily rotation specifically?

A 24h shelf-life on shared `?password=` links was the design
constraint. Hourly rotation breaks long retro sessions; weekly rotation
makes shared links valuable to attackers for too long. Daily is the
sweet spot.

### Why Asia/Taipei?

The team operates from Taipei. Hard-coding a specific timezone (rather
than the visitor's local time) means everyone — visitors in Tokyo,
visitors in Berlin, the cron jobs on the server — agree on what
"today's password" is at any given moment.

We hard-coded `UTC+8` rather than calling `Intl.DateTimeFormat` because:

- The Edge runtime supports `Intl` but it adds bundle weight for no
  benefit.
- Taiwan does not observe DST, so the offset is constant.

### Why both a cookie AND a `?password=` URL bypass?

- **Cookie** is the steady-state UX once you've logged in: visit any
  page, no friction, until midnight Taipei.
- **URL bypass** is for the share-link case: a facilitator pastes a
  single link into Slack and the recipient gets one-click entry with
  the password stripped from the address bar after the redirect.

The middleware handles both in a single pass: bypass first (sets
cookie + 302 to clean URL), cookie check second.

### Why `?password=`-stripping after the bypass?

Without the strip, the password would persist in:
- The visitor's address bar (so a screenshot leaks it).
- The browser history.
- Any `Referer` headers sent to third-party assets.

302-redirecting to the same URL with the param removed pushes the
clean URL onto history (`replaceState` semantics for navigations) and
prevents downstream leakage.

### Why a `Suspense` boundary on the dashboard?

`useSearchParams()` opts a route out of static prerendering unless it's
inside a `Suspense` boundary. Before this change the dashboard was
implicitly dynamic (and the build emitted a warning that's now an
error in this Next version). Wrapping the inner component in
`<Suspense fallback={null}>` lets Next prerender the shell and resolve
the params on the client. This is unrelated to the gate but blocked
the build, so we fixed it in the same change.

## How it works

### Request flow

```
                     ┌──────────────────────────┐
HTTP request ──────► │  src/proxy.ts            │
                     │                          │
                     │  1. Allow-listed path?   │  yes ─► next()
                     │     (/login, /api/auth,  │
                     │      /api/health, _next, │
                     │      static asset)       │
                     │                          │
                     │  2. ?password=YYYYMMDD?  │  yes ─► set cookie,
                     │     verify against       │         302 to clean URL
                     │     today's Taipei date  │
                     │                          │
                     │  3. Cookie valid?        │  yes ─► next()
                     │     verify(cookie)       │
                     │     === today            │
                     │                          │
                     │  4. /api/* path?         │  yes ─► 401 JSON
                     │                          │
                     │  5. otherwise            │  ───► 302 /login?next=…
                     └──────────────────────────┘
```

### Cookie shape

```
Name:       tretro-auth
Value:      yyyymmdd  (today in Taipei, e.g. "20260510")
HttpOnly:   true
SameSite:   Lax
Secure:     true (in production), false (in development)
Path:       /
Max-Age:    msUntilTaipeiMidnight() / 1000  (capped to next rollover)
```

The cookie value is the password itself. There's no point in adding a
signed token because:

- The "secret" (today's date) is publicly derivable, so signing adds no
  security.
- The verify path stays simple: `verifyPassword(cookie.value)`.
- Daily rotation is achieved naturally because tomorrow's
  `verifyPassword(yesterday's value)` returns false.

### Module relationships

```
            ┌──────────────────────────────┐
            │ src/lib/utils/dailyPassword  │
            │   getDailyPassword           │
            │   verifyPassword             │
            │   msUntilTaipeiMidnight      │
            └──────────────────────────────┘
                 ▲           ▲           ▲
                 │           │           │
                 │           │           │
       ┌─────────┘           │           └────────────┐
       │                     │                        │
┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐
│ proxy.ts     │    │ api/auth/route │    │ e2e/global-setup.ts  │
│ (Edge runtime)│    │ (Node runtime) │    │ (Playwright)         │
└──────────────┘    └────────────────┘    └──────────────────────┘
       │                     │                        │
       │ redirects to        │ called from            │ called once before
       ▼                     ▼                        ▼
   /login page           login form                e2e suite
```

The utility is the single source of truth — the same `verifyPassword`
runs in the Edge middleware, the Node API route, and the Playwright
setup.

### What's NOT changed

- `src/app/api/rooms/{id}/participants/route.ts` — still issues
  `sessionToken` exactly as before. The gate sits in front of it.
- `src/lib/socket/middleware.ts` — still authenticates socket
  connections via the participant `sessionToken`. The gate doesn't
  reach into the socket layer; it doesn't need to, because you can
  only obtain a `sessionToken` by hitting the gated REST API.

## How to use it (for engineers)

### Reading the cookie server-side

```ts
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyPassword } from '@/lib/utils/dailyPassword';

const c = (await cookies()).get(AUTH_COOKIE_NAME);
if (!verifyPassword(c?.value)) {
  // not authenticated
}
```

### Adding a new public endpoint (escape hatch)

Edit `src/proxy.ts` and add the path to the allow-list near the
top of the function:

```ts
if (
  pathname === '/login' ||
  pathname.startsWith('/api/auth') ||
  pathname.startsWith('/api/health') ||
  pathname.startsWith('/api/your-new-public-endpoint')   // ← here
) {
  return NextResponse.next();
}
```

Be conservative: every entry here is a hole in the gate.

### Running the test suite

- `npx jest src/__tests__/unit/utils/dailyPassword.test.ts` — fast unit
  tests, no server.
- `npx playwright test` — boots `tsx server.ts`, runs `globalSetup`,
  then drives the browser. You'll need
  `playwright/.auth/user.json` to be writable (it's gitignored).

## Caveats

- **Edge runtime constraints**: `src/proxy.ts` runs in the Edge
  runtime. Don't import any module that pulls in `better-sqlite3` or
  other Node-only deps from there. `dailyPassword.ts` is intentionally
  free of side-effects and Node imports.
- **Cookie expiry edge case**: a tab open across the Taipei midnight
  rollover will silently lose access on the next navigation. The user
  re-enters the new password and continues. We don't push a websocket
  notification of expiry — the existing socket session continues to
  work because socket auth uses a separate `sessionToken` that doesn't
  expire at midnight.
- **No CSRF token on `/api/auth`**: we accept the password from any
  origin, since the password itself is the only thing that matters for
  setting the cookie. The cookie is `SameSite=Lax`, which mitigates
  cross-site `POST` from arbitrary forms.
- **Open-redirect protection**: `/login` reads `?next=` and rejects
  anything that doesn't start with a single `/`. Don't extend that
  predicate without thinking about how it interacts with
  `//evil.example.com` and `\0/evil.example.com` parsings.
- **Hard-coded timezone**: changing the password timezone requires a
  code edit + redeploy. We considered an env var (`TRETRO_PASSWORD_TZ`)
  but rejected it as YAGNI — the team is in Taipei.
