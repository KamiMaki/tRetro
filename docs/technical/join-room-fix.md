# Technical: join-room stale-token recovery

## What changed
- Added `src/lib/services/joinOrCreateParticipant.ts` — pure service that
  decides whether to reuse an existing participant or create a fresh one,
  given `(roomId, nickname?, existingSessionToken?)`.
- Updated `src/app/api/rooms/[roomId]/participants/route.ts` — thin HTTP
  adapter over the service. Now accepts an optional `sessionToken` field
  in the request body. Returns 200 on reuse, 201 on create, plus the same
  400/404/410 error responses as before.
- Updated `src/app/room/[roomId]/page.tsx` — removed the optimistic
  short-circuit that trusted any sessionStorage token whose `roomId`
  matched the URL. The page now always calls the join API on mount,
  passing the cached token if (and only if) it was originally stored for
  the same room. The server is the single source of truth for whether the
  token is still valid.
- Added `src/__tests__/unit/services/joinOrCreateParticipant.test.ts` —
  8 unit tests for the service.

## Why
Before the fix the page short-circuited like this:

```ts
const existingToken = sessionStorage.getItem('sessionToken');
const storedRoomId = sessionStorage.getItem('roomId');
if (existingToken && storedRoomId === roomId) {
  setSessionToken(existingToken);
  setReady(true);
  return; // <-- never asks the server if the token is still valid
}
```

Whenever `data/retro.db` was wiped or rebuilt (a common dev / deploy
operation given the sqlite-on-disk persistence model), the participant
row backing the cached token disappeared. The page still trusted the
cached token and handed it to socket.io. The socket auth middleware
in `src/lib/socket/middleware.ts` then rejected the connection with
`Invalid session token`. From the user's perspective: the board UI
rendered, the room name said `Loading…`, the connection pill said
`Error`, and nothing they did made it recover — refreshing reproduced
the same broken state because sessionStorage still pointed at the dead
token.

The whole point of routing through the server every visit is to make
this self-healing: the server can tell the difference between "this
token is fine, reuse it" and "this token is dead, here's a new one".
The client has no way to know.

## How it works

```
+----------------------+
| RoomPage mount       |
|  /room/{roomId}      |
+----------+-----------+
           |
           v
+----------------------+        +-------------------------------+
| reuseToken =         |        | sessionStorage.sessionToken   |
|   sessionToken IF    |<-------+ sessionStorage.roomId         |
|   storedRoomId ==    |        +-------------------------------+
|   URL roomId         |
+----------+-----------+
           |
           v
+--------------------------------------------+
| POST /api/rooms/{roomId}/participants      |
| body: { nickname, sessionToken: reuseToken}|
+----------+---------------------------------+
           |
           v
+--------------------------------------------+
| joinOrCreateParticipant(roomId, nick, tok) |
|                                            |
|   room?  ── no ─────────► 404 Room not     |
|   room.status=='closed'?─► 410 Closed      |
|                                            |
|   tok set?                                 |
|     ├ yes ─► findBySessionToken(tok)       |
|     │         ├ same room? ► REUSE (200)   |
|     │         └ else      ┐                |
|     └ no  ────────────────┘                |
|                                            |
|   nickname trimmed?                        |
|     ├ no  ─► 400 Nickname required         |
|     └ yes ─► participantRepo.create        |
|              ► CREATE (201)                |
+----------+---------------------------------+
           |
           v
+--------------------------------------------+
| Client persists token in sessionStorage    |
| and opens the socket.io connection.        |
+--------------------------------------------+
```

Key invariants:
- **Idempotent**: refreshing or reopening a tab reuses the same participant
  whenever the token is still good.
- **Self-healing**: a stale or cross-room token is silently rotated; the
  user never sees the broken state.
- **No silent nickname rewrites**: on the reuse path the participant keeps
  the nickname they originally joined with — other clients' rosters do
  not shuffle on every refresh.

## Usage

For API consumers (e.g. e2e tests):

```bash
# First visit — no token, mints fresh participant (201)
curl -X POST http://localhost:3000/api/rooms/$ROOM_ID/participants \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"Alice"}'

# Subsequent visit — pass the token, get the SAME participant back (200)
curl -X POST http://localhost:3000/api/rooms/$ROOM_ID/participants \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"ignored","sessionToken":"<uuid>"}'

# Stale token — server mints fresh (201). Old token is forgotten.
curl -X POST http://localhost:3000/api/rooms/$ROOM_ID/participants \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"Alice","sessionToken":"deadbeef"}'
```

## Caveats
- A stale token whose participant row is gone leaves the row's history
  (cards authored by that participant) orphaned only in the sense that
  the recovered user has a new `participantId`. They still see all cards
  in the room — only their authorship marker changes. That matches the
  pre-fix behaviour, where the user would simply create a new participant
  manually after the page broke.
- The fix does not retroactively rebind orphaned cards to the new
  participant. That's intentional: the server has no safe way to know
  whether the human at the keyboard is the original author.
