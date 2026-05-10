# Daily-password gate

tRetro is now gated behind a daily-rotating password. This page explains
what facilitators and participants need to know to get into a room.

## What's the password?

**Today's date in Asia/Taipei time, formatted as `yyyymmdd`.**

Examples:
- `2026-05-10` (Taipei) → password is `20260510`
- `2026-01-01` (Taipei) → password is `20260101`

The password rotates at **00:00 Taipei time, every day**. Yesterday's
password stops working the moment the calendar flips, even if you're
still mid-sentence.

> Taiwan does not observe Daylight Saving Time, so the offset is always
> UTC+8.

## Two ways to get in

### Option 1 — Type it at the login page

1. Visit any tRetro URL.
2. You'll be redirected to `/login`.
3. Type today's date as 8 digits (no dashes, no slashes).
4. Press **Unlock**.

That's it. You're now logged in for the rest of the day on this browser.
The next time you visit any page on this device, you skip the login
screen until midnight Taipei.

### Option 2 — Share a self-unlocking link

Append `?password=YYYYMMDD` to any URL you send out. The link will:

1. Validate the password.
2. Set the auth cookie on the visitor's browser.
3. **Redirect to the same URL with the `?password=` removed**, so the
   password isn't preserved in the visitor's address bar, browser
   history, or any screenshots they take afterwards.

#### Example: invite a guest to a room

```
https://retro.example.com/room/aB3xYz9q?password=20260510
```

When the guest clicks the link, they land directly on the room board
with the URL cleaned up to:

```
https://retro.example.com/room/aB3xYz9q
```

No login page, no nickname prompt — they're straight in as an anonymous
guest.

#### Example: drop someone on the dashboard

```
https://retro.example.com/?password=20260510
```

Same behaviour: validate, set cookie, redirect to a clean `/`.

## Frequently asked questions

### Why a *daily* password — isn't that weak?

It's not trying to be a real authentication system. The retro board is
**anonymous by design** — no accounts, no emails — but it was also
openly accessible to anyone who guessed a room ID. The daily password
adds two things:

1. **A speed bump for random visitors and crawlers**.
2. **An expiry date for shared links**, so a screenshot of
   `?password=20260510` from your team chat stops working tomorrow.

If you need real identity-based access control, the daily-password gate
is *not* what you want. It's the digital equivalent of "buzz me up at
the door."

### My link from yesterday doesn't work anymore

That's the feature. Send a fresh link with today's date. Or just point
people at `/login` and tell them today's code over Slack/Teams/etc.

### I'm hosting tRetro for an internal team in another timezone

The password algorithm is fixed at Asia/Taipei. If the team needs a
different timezone, change `TAIPEI_OFFSET_MINUTES` in
`src/lib/utils/dailyPassword.ts` and rebuild. There's no runtime
override.

### Does this protect the realtime / Socket.IO traffic too?

Yes, transitively. To join a room over Socket.IO you need a
`sessionToken`, and the only way to get one is to call
`POST /api/rooms/{id}/participants`, which is gated. So no random web
client can speak the realtime protocol either.

### Can I log out?

The cookie auto-expires at the next Taipei midnight, so logout happens
for free at most 24h later. If you need to drop access immediately on a
shared device, clear cookies for the site or call
`fetch('/api/auth', { method: 'DELETE' })` from the browser console.

### What does the `/api/health` endpoint return when I'm not logged in?

It works without a password. `/api/health` is intentionally public so
ops tooling (Docker healthchecks, uptime monitors) can probe it without
also having to know today's date.

## Tips for facilitators

- **Sending the room link**: prefer the `?password=` form when sharing
  with people who haven't visited tRetro before. They get one-click
  entry; the password never touches their address bar history.
- **Posting in a public channel**: post just the room URL without the
  password. Tell people to grab today's code from a private channel or
  the login page. The two-step entry is annoying for guests but stops
  password leakage.
- **Pinning a "today's code" message**: don't. The whole point is that
  the password is computable from the date, so a pinned message just
  becomes wrong every day at midnight.
