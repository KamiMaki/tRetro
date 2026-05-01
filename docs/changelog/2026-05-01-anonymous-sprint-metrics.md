# Anonymous Sprint Metrics — 2026-05-01

## Summary

Adds end-to-end Sprint metrics to tRetro: each participant scores
seven dimensions (speed, comms, mood, fun, quality, refactor,
incident) on a 1–100 slider, the team's **average** is broadcast in
real-time, and a cross-room sparkline tracks the trend on the history
page. The whole feature is built around one privacy invariant:
**individual scores never leave the database**.

## What changed

### Added
- DB table `metric_submissions` (room_id, participant_id, metric_key, score, timestamps) with `UNIQUE(room_id, participant_id, metric_key)` for idempotent re-submission.
- Repo `src/lib/db/repositories/metric.repo.ts` — `submit()`, `getAggregateByRoomId()`, `getOwnScores()`, `getTeamHistory()`.
- Socket handler `src/lib/socket/handlers/metric.handler.ts` for `metrics:submit` → broadcasts `metrics:aggregate-updated` to the whole room and echoes `metrics:own-updated` privately to the submitter.
- Three socket events: `metrics:submit`, `metrics:aggregate-updated`, `metrics:own-updated`.
- REST `GET /api/metrics/history?limit=N` — anonymous team trend across recent rooms.
- UI component `src/components/metrics/MetricsPanel.tsx`:
  - Always-visible team aggregate (gradient bars + average + submission count, never names)
  - Expandable private slider form with a "Save anonymous scores" submit
- History page `<MetricsHistorySection/>` — bar sparkline per metric across the last 8 retros.
- Type definitions `MetricKey`, `MetricDef`, `METRIC_DEFS`, `MetricAggregate`, `OwnMetricScores`, `MetricsHistoryEntry`, `SubmitMetricsPayload` in `src/lib/types/index.ts`.
- 3 new E2E specs (aggregate API privacy, team-history API privacy, full UI submission flow).

### Changed
- `src/lib/socket/server.ts` registers `registerMetricHandlers`.
- `src/lib/socket/handlers/room.handler.ts` — `ROOM_JOINED` payload now carries `metricsAggregate` + `ownMetricScores` so the panel hydrates instantly on reconnect.
- `src/lib/hooks/useRoom.ts` exposes `metricsAggregate`, `ownMetricScores`, `submitMetrics(scores)` and listens for the two new socket events.
- `src/components/room/RoomBoard.tsx` renders `<MetricsPanel/>` between the board and Action items.
- `src/app/api/rooms/[roomId]/history/route.ts` includes `metricsAggregate` in its JSON.
- `src/app/room/[roomId]/history/page.tsx` renders the new metrics section with sparkline.

### Removed
Nothing.

## Privacy guarantees (verified)

- API responses contain **only** `metricKey`, `average`, and `submissions` — no participant id, nickname, or author field is ever serialized.
- `participant_id` is consumed server-side for dedup only and never leaves the database.
- Two E2E tests assert that the JSON payload of both APIs (`/api/rooms/:id/history` and `/api/metrics/history`) does not contain the substrings "participant", "nickname", or "author".

## Verification

- `npx tsc --noEmit` — passes
- `npm run build` — passes (12 routes incl. `/api/metrics/history`)
- `npm run test:e2e` — **16/16 passing**, including the 3 new specs
- Manual visual verification at 1440×900 (dark mode):
  - Empty room shows panel with no submissions, "Submit my scores" CTA
  - Submitting moves all 7 bars + shows "1 submission · you submitted" + success toast
  - Inserting a phantom second participant via SQL flips bars to averaged values (e.g. speed: 71 = avg(82, 60)) and the submissions counter goes to 2

## How to use (developer)

Submit scores from the client:

```ts
const { submitMetrics } = useRoom({...});
submitMetrics({ speed: 80, comms: 65 }); // sparse - only metrics you scored
```

Read aggregate (anywhere):

```bash
curl /api/rooms/:roomId/history     # → metricsAggregate
curl /api/metrics/history?limit=8   # → cross-room trend
```

## Known limitations

- Score range is hard-coded 1–100 (no decimals). UI clamps via the slider.
- The "X submissions" counter does reveal _how many_ people submitted — by design — but never _who_.
- No CSV / Markdown export of metrics yet (the existing room export ignores them).
