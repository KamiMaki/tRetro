# 2026-05-10 — Daily-password gate (anonymous access control)

## Summary

Adds an anonymous, daily-rotating password gate in front of every page and
API call. The password is the current calendar date in **Asia/Taipei** as
`yyyymmdd`, so it changes silently at 00:00 Taipei time without any admin
action. Two ways to get past the gate:

1. Visit `/login` and type today's password.
2. Open any link with `?password=YYYYMMDD` appended — the middleware
   validates it, sets the auth cookie, and redirects to the same URL
   without the param so the password isn't preserved in history /
   referrers / screenshots.

Once authenticated, an HttpOnly `tretro-auth` cookie carries the gate for
the rest of the day; it auto-expires at the next Taipei midnight.

## What changed

### New
- `src/lib/utils/dailyPassword.ts` — `getDailyPassword`,
  `verifyPassword`, `msUntilTaipeiMidnight`. Pure, Edge-runtime safe (no
  `Intl` dependency, just a UTC + 8h offset since Taiwan has no DST).
- `src/app/api/auth/route.ts` — `POST /api/auth { password }` sets the
  cookie on success; `DELETE /api/auth` clears it (sign-out).
- `src/app/login/page.tsx` — Aurora-styled login form, reads `?next=` for
  post-login redirect (sanitised to same-origin paths).
- `src/proxy.ts` — Edge middleware that gates every request, accepts
  `?password=` URL bypass, and 302s unauthenticated users to
  `/login?next=…`. Returns `401 JSON` for unauthenticated `/api/*` calls.
- `src/__tests__/unit/utils/dailyPassword.test.ts` — 10 tests covering
  Taipei day-rollover, year/month boundaries, length/type rejection, and
  `msUntilTaipeiMidnight` bounds.
- `src/__tests__/e2e/global-setup.ts` — Playwright global setup that
  authenticates once and persists `storageState` to
  `playwright/.auth/user.json` so the existing E2E suite still runs behind
  the gate.

### Modified
- `playwright.config.ts` — adds `globalSetup` and `use.storageState`.
- `.gitignore` — ignores `playwright/.auth/`.
- `src/app/page.tsx` — wraps `useSearchParams()` in `Suspense` so the
  build can prerender the dashboard shell.

### Public escape hatches (allow-listed in middleware)
- `/login` — the form itself
- `/api/auth` — the form's POST target
- `/api/health` — uptime probes / Docker healthcheck
- `_next/*`, `favicon.ico`, common static asset extensions — handled via
  the `matcher` regex so the gate is user-experienced (no flashes of
  unstyled content) but data pages and APIs remain protected.

## Why

The retro board is anonymous by design — no user accounts, no email
verification — but it was also openly accessible to anyone who guessed a
room ID. The team needed *some* friction at the front door without
introducing real identity. A password the facilitator already knows
(today's date) hits the sweet spot:

- **Zero coordination cost** — the password is derivable from a wall
  clock; no chat-channel, no "what's the code today?" pings.
- **Zero leak shelf-life** — even if someone screenshots the URL bar
  with `?password=20260510`, that URL is dead at midnight Taipei.
- **Still anonymous** — the cookie carries the password value, not an
  identity. Two browsers with the same cookie are indistinguishable.

The `?password=` URL bypass exists so a facilitator can send a single
self-contained Slack/email link (`/room/abc?password=20260510`) to a
guest who has never been here before, instead of two separate messages.

## Verification

- `npx jest src/__tests__/unit/utils/dailyPassword.test.ts` — 10/10 green.
- `npx next build` — green after wrapping the dashboard in Suspense.
- Manual: visiting `/` without a cookie redirects to
  `/login?next=%2F`; submitting today's password redirects back to `/`;
  `/?password=YYYYMMDD` strips the param and lands on the dashboard.
- E2E suite continues to pass thanks to the storageState fixture.

## Caveats

- The "password" is publicly derivable — anyone who reads this changelog
  knows the algorithm. The gate's value is **rotation + share-link
  ergonomics**, not secrecy. Treat it as a "no random crawler, no
  shoulder-surfer" filter, not as authentication.
- The middleware runs in the Edge runtime; do not import any
  `better-sqlite3` / Node-only modules from `dailyPassword.ts`.
- Socket.IO connections still use the existing participant
  `sessionToken` (issued by `/api/rooms/{id}/participants`), which can
  only be obtained through the gated REST API — so the gate transitively
  protects the realtime layer too without needing socket-level changes.
- The cookie's `maxAge` is capped to the next Taipei midnight, so a tab
  left open across the rollover will silently lose access on the next
  navigation. The user just re-enters the new password.
