# Sprint metrics — technical document

Companion doc to commit `feat(metrics): anonymous sprint metrics with
team aggregate` (2026-05-01). Read this before extending the metric
list, changing the privacy model, or wiring metrics into another
surface (export, dashboard, etc.).

## What changed

### Files added
- `src/lib/db/repositories/metric.repo.ts` — DB layer
- `src/lib/socket/handlers/metric.handler.ts` — Socket handler
- `src/components/metrics/MetricsPanel.tsx` — In-room UI
- `src/app/api/metrics/history/route.ts` — Cross-room aggregate API

### Files modified
- `src/lib/db/schema.ts` — adds the `metric_submissions` table + 2 indexes
- `src/lib/types/index.ts` — adds `MetricKey`, `MetricDef`, `METRIC_DEFS`, `MetricAggregate`, `OwnMetricScores`, `MetricsHistoryEntry`, `SubmitMetricsPayload`; extends `RoomJoinedPayload`
- `src/lib/socket/events.ts` — three new events
- `src/lib/socket/server.ts` — registers the metric handler
- `src/lib/socket/handlers/room.handler.ts` — `ROOM_JOINED` now carries `metricsAggregate` + `ownMetricScores`
- `src/lib/hooks/useRoom.ts` — exposes the new state + `submitMetrics()`
- `src/components/room/RoomBoard.tsx` — renders `<MetricsPanel/>`
- `src/app/api/rooms/[roomId]/history/route.ts` — adds `metricsAggregate` to JSON
- `src/app/room/[roomId]/history/page.tsx` — renders `<MetricsHistorySection/>`
- `src/__tests__/e2e/retro-board.spec.ts` — 3 new specs

### Files NOT touched
- All existing card / tag / vote / reaction / drawing / comment code
- The Markdown / HTML export route (intentional — see "Future work")

## Why this design

### 1. The privacy invariant

> Individual scores never leave the database.

Every other design choice flows from this. Specifically:

- The participant_id column on `metric_submissions` is **never** referenced in any client-facing payload. The repo's public methods return either:
  - **Aggregate** rows (`metricKey, average, submissions`) — for everyone
  - **Own** rows (`{[metricKey]: score}`) — only ever sent over a private socket channel back to the submitter
- The aggregate query uses `AVG()` and `COUNT()` only — `GROUP_CONCAT` of identities is intentionally absent.
- Both API endpoints (`/api/rooms/:id/history` and `/api/metrics/history`) return identity-free objects with exactly three keys per metric: `metricKey`, `average`, `submissions`.
- Two E2E specs assert the strings `participant`, `nickname`, and `author` do not appear anywhere in the JSON of either endpoint. If you add a field that breaks this, the tests fail.

### 2. Idempotent re-submission

`UNIQUE(room_id, participant_id, metric_key)` + `ON CONFLICT … DO UPDATE` means a participant can resubmit any number of times and the table always holds at most one row per (room, participant, metric). The aggregate recomputes automatically. There is no "delete" path — a participant just submits a different value.

The `submit()` repo method:

```ts
// `participantId` is consumed for dedup ONLY — it never leaves the server.
submit(roomId, participantId, scores): MetricKey[]
```

Returns the keys that were actually written (so the handler can decide to broadcast or short-circuit).

### 3. Two parallel socket channels per submission

When a client emits `metrics:submit`, the server replies with **two** events:

| Event | Recipients | Payload | Purpose |
|---|---|---|---|
| `metrics:own-updated` | only the submitter | `{ scores: OwnMetricScores }` | Persist the private state in the panel + show toast |
| `metrics:aggregate-updated` | all sockets in the room | `{ metrics: MetricAggregate[] }` | Update the team bars in real-time |

This split keeps every client's "private own scores" state disjoint from the broadcast aggregate — there is no codepath where the submitter's scores get mixed into a payload that anyone else receives.

### 4. Slider state hydration on reconnect

If a participant submits, refreshes, and rejoins, they should see their previous slider positions. The server therefore reads `metricRepo.getOwnScores(roomId, participantId)` inside the `ROOM_JOINED` handler and ships it as part of the join payload (alongside the aggregate). `useRoom` seeds the corresponding state in its `ROOM_JOINED` listener.

The `MetricsPanel` component uses an `useEffect` to re-sync its draft state whenever `ownMetricScores` changes — so a re-submit by the same participant in another tab still updates the slider here.

### 5. Default panel value

When a slider has no own-score yet, it defaults to `70` (a moderately positive value). This is purely cosmetic — the slider only affects the database when the user clicks **Save anonymous scores**. We picked 70 (not 50) because all-50 sliders look like a flat baseline and bias people toward not moving them.

### 6. Sparkline

`<MetricsHistorySection/>` calls `GET /api/metrics/history?limit=8` from the per-room history page. The sparkline is rendered with plain `<div>` bars (one per past room, oldest → newest left to right). Bar height = average / 100. We deliberately did NOT pull in a charting library — the sparkline is 12 lines of CSS and renders identically in dark and light modes.

## Schema

```sql
CREATE TABLE IF NOT EXISTS metric_submissions (
  id             TEXT PRIMARY KEY,
  room_id        TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  metric_key     TEXT NOT NULL,
  score          INTEGER NOT NULL CHECK(score BETWEEN 1 AND 100),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, participant_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_metric_submissions_room ON metric_submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_metric_submissions_room_metric ON metric_submissions(room_id, metric_key);
```

ON DELETE CASCADE on the participant FK means deleting a participant
(unlikely in normal flow, but possible) erases their submissions too.

## API surface

### Sockets

```
client → server
  metrics:submit { scores: OwnMetricScores }

server → submitter (private)
  metrics:own-updated { scores: OwnMetricScores }

server → all in room
  metrics:aggregate-updated { metrics: MetricAggregate[] }
```

### REST

```
GET /api/rooms/:roomId/history
  → existing fields + metricsAggregate: MetricAggregate[]

GET /api/metrics/history?limit=N (default 12, max 50)
  → { history: MetricsHistoryEntry[] }
```

## Module relationships

```
src/lib/types/index.ts
  ↑
  ├── src/lib/db/repositories/metric.repo.ts (DB layer)
  │      ↑
  │      ├── src/lib/socket/handlers/metric.handler.ts
  │      │      ↑
  │      │      └── src/lib/socket/server.ts (registers handler)
  │      ├── src/lib/socket/handlers/room.handler.ts (ROOM_JOINED)
  │      ├── src/app/api/rooms/[roomId]/history/route.ts
  │      └── src/app/api/metrics/history/route.ts
  │
  ├── src/lib/hooks/useRoom.ts (state + submitMetrics)
  │      ↑
  │      └── src/components/room/RoomBoard.tsx
  │             ↑
  │             └── src/components/metrics/MetricsPanel.tsx
  │
  └── src/app/room/[roomId]/history/page.tsx (history sparkline)
```

## Code patterns

### Adding a new metric

1. Add the key to the `MetricKey` union in `types/index.ts`.
2. Add a row to `METRIC_DEFS` (label, shortLabel, emoji, tone).
3. That's it. The repo iterates `METRIC_KEYS`, the panel renders one row per def, and the aggregate query uses `GROUP BY metric_key` so new keys auto-appear once any submission lands.

There is no separate migration needed — `metric_key` is a TEXT column with no enum constraint. (We considered a check constraint and decided against it: adding a metric should not require a schema migration.)

### Reading the aggregate from a non-room context

```ts
import { metricRepo } from '@/lib/db/repositories/metric.repo';
const aggregate = metricRepo.getAggregateByRoomId(roomId);
```

Returns one row per defined metric, with `average: null` when no
submissions yet. The list is stable across calls so UI iteration is
safe.

### Reading own scores

```ts
const own = metricRepo.getOwnScores(roomId, participantId);
// → { speed: 80, comms: 65, ... } (sparse — only metrics this participant scored)
```

This call is only ever made server-side for two purposes:

1. To hydrate the slider form in `ROOM_JOINED`
2. To echo back the new state in `metrics:own-updated` after a submit

If you call it from anywhere else, you're potentially leaking — make sure the response goes back only to the participant whose `id` you queried with.

## Caveats

- **Default slider value is 70, not 50.** This is intentional UX (see "Why this design § 5") but means an unsaved slider is not a "neutral" 50. Don't read the slider value as data until the user submits.
- **Submission count reveals participation, not identity.** An attacker who watches the count tick up by 1 the moment a specific person joins a private 2-person room could infer that person submitted. We accept this in exchange for the social affordance of "X / Y people have submitted." If you need stronger anonymity in tiny rooms, hide the count when `submissions < 3`.
- **Score range is 1–100 integer.** The `CHECK(score BETWEEN 1 AND 100)` constraint will reject 0 or > 100. The repo also clamps to this range before insert. If you change the range, update both.
- **`AVG()` returns a real number** — we round to 1 decimal in the repo (`Math.round(avg * 10) / 10`). Don't pull `avg_score` directly from a SQL query elsewhere; use the repo so rounding is consistent.
- **No metrics in export yet.** The Markdown / HTML export route ignores the new aggregate. If we add it, take care: the export is sometimes shared outside the team, so it should ship the aggregate but never participant_id.
- **The sparkline is in chronological order from getTeamHistory(), which orders by `rooms.created_at DESC`.** The history page reverses to display oldest-left. If you change one ordering, change the other.

## Testing

```bash
npx tsc --noEmit       # passes
npm run build          # 12 routes incl. /api/metrics/history
npm run test:e2e       # 16/16 passing
```

E2E coverage:
- `metrics aggregate API never leaks identity fields` — JSON contains exactly `{metricKey, average, submissions}` keys; no participant/nickname/author substrings
- `team metrics history endpoint is anonymous-only` — same shape check on the cross-room endpoint
- `renders panel with empty aggregate then shows submitter own scores` — UI flow: header → expand → 7 sliders → set value → submit → "you submitted" + 1 submission appears

## Future work

- **Export integration** — include the team aggregate in the Markdown / HTML export. Take care: the export sometimes leaves the team, so it must include only `{metricKey, average, submissions}`.
- **Per-metric notes** — let participants attach a one-line anonymous note to a low score ("we keep redoing the same staging deploy"). Storage and broadcast pattern is identical, just add a `note TEXT` column.
- **Trend annotations** — the sparkline could highlight the room with the highest / lowest average per metric. Pure UI work.
- **Charting library** — if we ever need richer visualisation (multi-line trends, distribution shape), bring in `recharts` or `visx`. The current bar sparkline was deliberately hand-rolled to avoid the dep.
