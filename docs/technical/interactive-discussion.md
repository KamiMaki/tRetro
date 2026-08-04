# Technical Reference: Interactive Discussion (2026-08-04)

> Covers cheers, combos, presenter-claim focus sync, card heat, and the
> 7-section Summary Prompt. All five ship in the same working-tree batch and
> share the discussion-mode UI, so they're documented together.

## What Changed

### New
| Path | Role |
|---|---|
| `src/lib/socket/handlers/cheer.handler.ts` | `cheer:send` handler — rate limit, combo detection, per-card tally, broadcast |
| `src/lib/socket/handlers/focus.handler.ts` | `focus:claim` / `focus:release` / `focus:set` handlers — presenter-claim state machine |
| `src/lib/socket/focus-store.ts` | In-memory `Map<roomId, {presenterId, cardId, socketId}>` — the actual state focus.handler mutates |
| `src/lib/utils/heat.ts` | `heatScore`, `heatLevel`, `cardHeatClass`; exports `HEAT_WARM_SCORE`/`HEAT_HOT_SCORE` |
| `src/components/discussion/CheerBurst.tsx` | Renders one cheer/combo: particle geometry, four animation archetypes, self-expiring |
| `src/__tests__/unit/socket/cheer.handler.test.ts` | Unit tests for rate limiting, combo detection, room/card scoping |
| `src/__tests__/unit/socket/focus.handler.test.ts` | Unit tests for claim/release/set/disconnect |
| `src/__tests__/unit/utils/heat.test.ts` | Unit tests for `heatScore`/`heatLevel`/`cardHeatClass` |

### Modified
| Path | Change |
|---|---|
| `src/lib/socket/events.ts` | Added `FOCUS_CLAIM`/`FOCUS_RELEASE`/`FOCUS_SET`/`FOCUS_UPDATED`, `CHEER_SEND`/`CHEER_BURST`/`CHEER_COMBO` |
| `src/lib/socket/handlers/limits.ts` | Added `CHEER_EFFECT_VALUES`/`isValidCheerEffect`, `CHEER_RATE_MAX`/`CHEER_RATE_WINDOW_MS`, `COMBO_WINDOW_MS`/`COMBO_MIN_CHEERS`/`COMBO_MIN_PARTICIPANTS`/`COMBO_COOLDOWN_MS` |
| `src/lib/socket/handlers/room.handler.ts` | `room:joined` payload now includes `focusState: getFocusState(roomId)` |
| `src/lib/socket/server.ts` | Registers `registerCheerHandlers`/`registerFocusHandlers` per connection |
| `src/lib/types/index.ts` | Added `CheerEffect`, `SendCheerPayload`, `CheerBurstPayload`, `LiveCheer`, `CheerComboPayload`, `LiveCombo`, `RoomFocusState`, `FocusUpdatedPayload` |
| `src/lib/hooks/useRoom.ts` | Client cheer/combo TTL queues, `presenterId`/`facilitatorFocus` state, `sendCheer`/`setFocus`/`claimPresenter`/`releasePresenter` emitters |
| `src/components/room/RoomBoard.tsx` | Wires `useRoom`'s new fields into `DiscussionPanel`, incl. `isActive={activeTab === 'discussion'}` |
| `src/components/discussion/DiscussionPanel.tsx` | Cheer bar + burst layers, combo overlay, presenter controls (主持討論/接手主持/停止主持), 跟隨主持人 switch, 回到主持人 pill, `cardHeatClass` on queue + focused card |
| `src/components/board/Card.tsx` | `cardHeatClass` applied to board cards |
| `src/app/globals.css` | Cheer particle keyframes, combo backdrop pulse, heat breathing-glow keyframes, `prefers-reduced-motion` fallbacks for all of the above |
| `src/lib/utils/aiExportTemplate.ts` | `DEFAULT_SUMMARY_PROMPT` rewritten (3 → 7 sections); per-card vote/reaction lines; 模式 + participant-count header lines; optional Sprint 指標 table |
| `src/app/api/rooms/[roomId]/export/route.ts` | `format=ai` loads per-card votes/reactions + metric aggregate, passes them via `AiSummaryOptions` |
| `src/components/room/RoomHeader.tsx` | `handleCopyAiPrompt` now sets an error state (and label) on fetch/clipboard failure instead of failing silently |
| `src/__tests__/unit/utils/aiExportTemplate.test.ts` | Updated for the 7-section prompt and new fields |

## Why

**Why is nothing here written to the database?** Cheers and presenter focus
are both moment-to-moment signals, not retro content. A cheer is a reaction
to what's on screen right now; a presenter's position is only meaningful
while the walkthrough is live. Persisting either would mean designing
storage, retention, and export semantics for data that stops being
meaningful the moment the meeting ends. Keeping them in server memory (and
mirroring that with client-side TTL queues) means the feature is exactly as
complex as it needs to be — see Caveats for what this trades away.

**Why is presenting a claim, not a role?** `participant.repo.ts` makes
every participant a Scrum Master — this app has no facilitator role to gate
"who may present" on. A first design that checked `isScrumMaster` had
nothing to check. The shipped model (`focus-store.ts`) treats presenting as
a claim: whoever calls `focus:claim` most recently holds the wheel, and the
claim is tied to the *socket id* that made it, not just the participant id.
That distinction is what makes reload-safety possible — see How It Works.

**Why does heat exclude votes and cheers?** Votes already render as a
consensus ring; folding them into heat would just be the same signal twice.
Cheers are excluded because they're nearly free to produce (one click,
often several in a burst) — any glow threshold built on them would reward
mashing the cheer bar rather than actually discussing the card. Comments
and reactions both require a person to stop and engage with the specific
card, which is the property heat is meant to surface.

**Why seven sections in the Summary Prompt instead of three?** The old
prompt asked for themes and signals but nothing about mood trends, cards
nobody engaged with, or whether existing action items were actually usable.
The new sections (情緒與士氣分析 / 被忽略的聲音 / the action-item quality
check folded into 建議的 action items) target exactly what a facilitator
reads a pasted-into-ChatGPT summary for: what's the mood, what's being
missed, and what should actually happen next sprint.

## How It Works

### Ephemeral broadcast pattern (cheers)

Neither a cheer nor a combo is acknowledged, persisted, or attributed. A
valid cheer fans out to the whole room — sender included — and an invalid
or over-budget one is dropped in silence (no error event; a red toast would
be a worse experience than a dropped emoji).

```
Client: sendCheer(cardId, effect)
   │  socket.emit('cheer:send', { cardId, effect })
   ▼
cheer.handler.ts  socket.on(CHEER_SEND)
   │  cardId valid + belongs to this room?           no → drop
   │  effect is one of the 8 CHEER_EFFECT_VALUES?     no → drop
   │  withinBudget(participantId, now)?               no → drop (rate-limited)
   │
   ├─ bumpCardTotal(roomId, cardId)  →  cardCheerTotal
   ├─ io.to(roomId).emit('cheer:burst', { cardId, effect, cardCheerTotal })
   │
   └─ registerComboCheer(roomId, effect, participantId, now)
        │  ≥3 cheers of this effect in the last 5s, from ≥2 distinct people,
        │  and the room+effect isn't in its 8s cooldown?
        └─ yes → io.to(roomId).emit('cheer:combo', { effect, count })

Client: useRoom's CHEER_BURST/CHEER_COMBO listeners
   │  push into a capped, TTL'd array (cheers ≤20 @2.6s, combos ≤4 @3.2s)
   ▼
DiscussionPanel
   │  cheers on the focused card → CheerBurst size="full" over the card
   │  cheers on any other card   → CheerBurst size="compact" in the corner
   │  combos                     → CheerBurst size="mega" + .combo-flash overlay
```

Both the rate limiter (`cheerWindows`) and the combo bookkeeping
(`comboWindows`, `comboLastFiredAt`) live as plain `Map`s inside
`cheer.handler.ts`'s module scope — one process, one set of maps, pruned
lazily on access rather than on a timer.

### Rate-limit and combo windows

| Constant | Value | What it gates |
|---|---|---|
| `CHEER_RATE_MAX` / `CHEER_RATE_WINDOW_MS` | 8 per 4,000ms | Per-participant sliding window; excess cheers are dropped, not queued |
| `COMBO_WINDOW_MS` | 5,000ms | How far back `registerComboCheer` looks for same-effect cheers |
| `COMBO_MIN_CHEERS` | 3 | Cheers required inside the window |
| `COMBO_MIN_PARTICIPANTS` | 2 | Distinct participants required — one person mashing a button never combos |
| `COMBO_COOLDOWN_MS` | 8,000ms | Minimum gap between two combos of the *same* room+effect key |

The combo key is `${roomId}::${effect}` — cards are deliberately not part
of it. A room rallying behind two neighbouring cards with the same effect
is still "the room cheering together," so combos are scoped to room+effect,
not room+effect+card.

### Presenter-claim state machine

`focus-store.ts` is the single source of truth, one entry per room:

```ts
interface FocusEntry { presenterId: string; cardId: string | null; socketId: string }
```

| Transition | Trigger | Effect |
|---|---|---|
| Claim / takeover | `focus:claim` (any participant, any time) | Overwrites the room's entry unconditionally — last claim wins, no permission check. A claim naming no card inherits the room's current card so followers aren't yanked to nowhere. |
| Move | `focus:set` | Only accepted if `presenterId` matches the caller; silently dropped otherwise. Client-side this is debounced 300ms so Next-Next-Next sends one update, not one per keypress. |
| Release | `focus:release` | Only frees the room if the caller's `presenterId` matches the holder. |
| Disconnect | socket `disconnect` | Only frees the room if the *dying socket's id* matches the entry's `socketId` — see stale-socket handling below. |

**Stale-socket / reload safety**: the entry stores the presenting
`socketId`, not just the `participantId`. `releaseFocus`'s disconnect path
only frees the room when the dying socket's id still matches the entry's
`socketId` — so once a *different* socket for the same participant has
claimed the room (overwriting `entry.socketId`), a disconnect event that
later arrives from the old, now-superseded socket no longer matches and is
a no-op. `focus.handler.test.ts`'s "survives a presenter reload" case
covers exactly this: the new socket claims first, then the old socket's
`disconnect` lands — and the room stays with the new socket's claim.
This makes disconnect-driven release correct with respect to *stale*
sockets; it depends on the new claim reaching the server before the old
socket's disconnect is processed. There's no separate "this participant
was presenting, reclaim on reconnect" logic on the client — see Caveats.

**Late-joiner seeding**: `room.handler.ts`'s `room:join` handler calls
`getFocusState(roomId)` and includes it as `focusState` on the `room:joined`
payload. `useRoom.ts` reads `payload.focusState` and seeds `presenterId` /
`facilitatorFocus` from it, so a participant who joins mid-walkthrough sees
the current presenter and card immediately instead of waiting for the next
`focus:updated` broadcast.

**Client-side following** (`DiscussionPanel.tsx`) is derived state, not
stored: `pausedPresenter` records *whose* broadcast the viewer stepped away
from by manually navigating. `following = someoneElsePresents &&
pausedPresenter !== presenterId` — so a handover to a new presenter
automatically resumes following, because the new presenter's id can never
equal the paused one.

### Card heat derivation

```
heatScore(commentCount, reactionTotal) = commentCount + reactionTotal
heatLevel(score) = score >= 12 ? 'hot' : score >= 6 ? 'warm' : null
cardHeatClass(card) = heatLevel(...) ? `heat-${level}` : undefined
```

`cardHeatClass` takes the card object directly (`comments`, `reactions`)
so every call site — `Card.tsx` (board), the discussion queue list, and the
focused card in `DiscussionPanel.tsx` — computes the same number from the
same inputs rather than re-deriving the rule three times.

### Module relationship

```
                         ┌─────────────────────┐
                         │  focus-store.ts      │  in-memory, per-room
                         │  (presenter, cardId,  │
                         │   socketId)           │
                         └─────┬───────────▲─────┘
                               │           │
                    claim/release/set   read (room:joined seed)
                               │           │
┌──────────────┐      ┌────────▼───────────┴─────┐      ┌──────────────────┐
│ cheer.handler │      │ focus.handler.ts          │      │ room.handler.ts   │
│ .ts           │      │ (focus:claim/release/set) │      │ (room:join seeds  │
│ (cheer:send)  │      └──────────────┬────────────┘      │  focusState)      │
└──────┬────────┘                     │                    └───────────────────┘
       │ cheer:burst / cheer:combo    │ focus:updated
       ▼                              ▼
                  useRoom.ts (client)
        cheers[]/combos[] TTL queues, presenterId, facilitatorFocus
                              │
                              ▼
                    DiscussionPanel.tsx
        CheerBurst (full/compact/mega) · presenter controls ·
        跟隨主持人 switch · cardHeatClass (queue + focused card)
                              │
                              ▼
                heat.ts  ← also called directly by Card.tsx (board)

aiExportTemplate.ts (DEFAULT_SUMMARY_PROMPT, buildAiSummaryMarkdown)
  ← fed by export/route.ts (per-card votes/reactions, metric aggregate)
  ← surfaced via RoomHeader.tsx's Summary Prompt button (copy + error state)
```

## Usage

### Sending a cheer (client)

```ts
const { sendCheer } = useRoom(roomId);
sendCheer(cardId, 'confetti'); // one of the 8 CheerEffect values
```

Nothing is returned and nothing needs to be awaited — the burst either
shows up via `cheer:burst` on every connected client (including the
sender) or it silently didn't happen (invalid card, invalid effect, or
rate-limited).

### Presenting (client)

```ts
const { claimPresenter, releasePresenter, setFocus, presenterId, participantId } = useRoom(roomId);

claimPresenter(currentCardId); // take or take over the wheel
setFocus(nextCardId);          // only takes effect if we're still the presenter
releasePresenter();            // step aside

const isPresenter = presenterId === participantId;
```

`DiscussionPanel` wires this up automatically once `onClaimPresenter` and
`onReleasePresenter` are both passed — see `canPresent` in
`DiscussionPanel.tsx`.

### Reading card heat

```ts
import { cardHeatClass, HEAT_WARM_SCORE, HEAT_HOT_SCORE } from '@/lib/utils/heat';

<div className={['sticky-card', cardHeatClass(card)].filter(Boolean).join(' ')}>
```

`card` needs only `comments` (array, length is what's counted) and
`reactions` (array of `{ count }`) — both already present on `CardDTOv2`.

### Customizing the Summary Prompt

Teams can override `DEFAULT_SUMMARY_PROMPT` via team settings
(`summaryPrompt`), unchanged by this batch — `buildAiSummaryMarkdown` still
falls back to the exported constant when a team has none set. To read the
full 7-section default (theme grouping, strong signals, mood/morale,
ignored voices, risks, action items, facilitator suggestions) see
`src/lib/utils/aiExportTemplate.ts:44`.

## Caveats

- **Reload safety for the presenter claim is an ordering guarantee, not an
  unconditional one.** `focus-store.ts` correctly ignores a disconnect from
  a stale (superseded) socket — see How It Works — but nothing on the
  client automatically re-sends `focus:claim` on reconnect. The claim
  survives a reload only because, in practice, the new socket's connection
  (and the room's own remount logic) tends to land before the old socket's
  disconnect is processed by the server. There is no code path that
  guarantees this ordering; a slow reconnect could in principle still lose
  the claim to a same-participant stale disconnect. Manual two-participant
  testing for this batch did not hit that ordering, but it is a timing
  property, not an invariant enforced in code.
- **Cheers, combos, and presenter state are all lost on server restart.**
  They live only in module-scope `Map`s inside `cheer.handler.ts` and
  `focus-store.ts` — a process restart mid-retro means the next cheer or
  claim starts from a clean slate. Nothing is corrupted by this (there's no
  DB row to leave inconsistent); the room simply "forgets" that anyone was
  presenting or that a rate-limit window was in progress.
- **Heat's cheer exclusion is deliberate, not an oversight.** Both `heat.ts`
  and `cheer.handler.ts`'s `CheerBurstPayload` type carry comments
  explaining this, but it's easy to assume "more engagement signals =
  better" and want to add cheers to the score later. Don't — see Why above
  for the spam-bait reasoning.
- **`prefers-reduced-motion: reduce` disables particle animation entirely**
  for cheers, combos, and the heat glow — see `globals.css`'s
  `@media (prefers-reduced-motion: reduce)` blocks. Cheers fall back to a
  static, non-animated chip (`cheer-chip-static`); heat falls back to a
  static tinted `box-shadow` ring; the combo backdrop pulse (`.combo-flash`)
  is set to `display: none` entirely rather than shown statically, since a
  full-panel flash has no meaningful static equivalent.
- **`cardCheerTotal` (on `CheerBurstPayload`) and `count` (on
  `CheerComboPayload`) are part of the server contract but currently unread
  by the client.** They were kept in the payload rather than stripped: the
  large "COMBO ×N" banner that would have displayed `count` was removed
  per product decision (the particle-density increase alone reads as "this
  is a bigger deal" without needing the number spelled out), and
  `cardCheerTotal` was an earlier candidate heat input that heat.ts ended
  up not using. Removing either field now would be a payload-shape change
  for no runtime benefit — a future UI that wants either number can read it
  without a server change.
- **The rate-limit map (`cheerWindows` in `cheer.handler.ts`) has no upper
  bound on the number of participant keys it can hold** — it grows by one
  key per distinct participant who has cheered recently, in any room, on
  this process. Each key's array is pruned to the current window on every
  access, so a single key never grows unbounded, but a very high-churn
  server (many rooms, many guest participants cheering once each) will
  accumulate one small array per participant for the lifetime of the
  process. This mirrors `focus-store.ts`'s existing "advisory, resets on
  restart" posture rather than introducing a new persistence concern.
- **Cheer/combo/heat effects only render while the Discussion tab is the
  active tab.** `DiscussionPanel`'s `isActive` prop (`activeTab ===
  'discussion'` in `RoomBoard.tsx`) gates whether `useRoom`'s live
  `cheers`/`combos` arrays are passed through at all — the panel stays
  mounted but hidden behind the other tabs (`display: none`), so without
  this gate, particle animations would run invisibly in a hidden subtree
  and could queue up before the tab is reopened. A cheer sent while another
  tab is active is still received by every connected client's socket; it
  just isn't rendered by a client whose Discussion tab isn't the visible
  one, and it is not replayed later when that tab becomes active. Card heat
  itself (the glow on the board) is unaffected by this — it's driven by
  comment/reaction counts already in `cards`, not by the live cheer stream.
