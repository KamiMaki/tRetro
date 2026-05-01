# Wave 2 + Wave 3 (partial) Technical: Workflow & Output Bridge

## 這次改了什麼

### New files
| Path | Purpose |
|---|---|
| `src/lib/util/consensus.ts` | `computeConsensus(votes, denom)` returning `{ pct, level, label }` with strong/mixed/weak buckets |
| `src/lib/utils/aiExportTemplate.ts` | `buildAiSummaryMarkdown(...)` — prompt header + retro content + closing instruction |
| `src/lib/facilitator/prompts.ts` | Static `FACILITATOR_STAGES` array (gather / vote / discuss / action / wrap) |
| `src/components/room/FacilitatorPanel.tsx` | Slide-in side drawer; portal-rendered, Esc + click-outside close |

### Schema / repo / socket
| Path | Change |
|---|---|
| `src/lib/db/migrations.ts` | Backfill `UPDATE participants SET is_scrum_master = 1 WHERE is_scrum_master = 0` after `CREATE_TABLES_SQL` |
| `src/lib/db/repositories/participant.repo.ts` | `create()` always inserts `is_scrum_master = 1` |
| `src/lib/db/repositories/room.repo.ts` | New `reopen(id)` method that nulls `closed_at` and resets status |
| `src/lib/socket/events.ts` | `ROOM_REOPEN`, `ROOM_REOPENED` event names |
| `src/lib/socket/handlers/room.handler.ts` | Reopen handler (SM-only by socket-data flag, but everyone is SM now) |
| `src/lib/hooks/useRoom.ts` | `reopenRoom()` action, `ROOM_REOPENED` listener that flips local room state and toasts |

### API
| Path | Change |
|---|---|
| `src/app/api/rooms/[roomId]/export/route.ts` | New `format=ai` branch returning `text/markdown; charset=utf-8` with `*-retro-ai-summary.md` filename |

### UI
| Path | Change |
|---|---|
| `src/app/globals.css` | Consensus heatmap rules (`[data-consensus="strong"\|mixed\|weak"]`), per-card large size override (specificity-bumped to beat compact density), per-card scrollbar already in place from Wave 1 |
| `src/components/board/Board.tsx` | `participantCount` and `onConvertToAction` props; bounded `.board-grid` height + `grid-auto-rows: minmax(0, 1fr)` |
| `src/components/board/Section.tsx` / `SectionFullscreen.tsx` | Same passthrough props |
| `src/components/board/Card.tsx` | Reads `participantCount`, computes `consensus` via `computeConsensus`; renders `data-consensus` and a `67%` pill; per-size toggle button; SM-only convert-to-action button |
| `src/components/board/CardForm.tsx` | Inline tag chip picker — removed the "tags" toggle button, chips render below textarea once focused or content-typed; "+ tag" pill inflates to inline `# name [add]` input |
| `src/components/board/ReactionBar.tsx` | Picker rendered via `createPortal(document.body)`; `CELL`/`PICKER_*` constants centralized; chip alignment normalized with explicit line-height + emoji font stack |
| `src/components/action-items/ActionItemForm.tsx` | New `prefilledContent` / `onConsumePrefill` props; useEffect populates description and auto-opens; cleared inline `colorScheme: 'dark'` (Wave 1.7 token covers it) |
| `src/components/action-items/ActionItemList.tsx` | Passthrough for prefill props |
| `src/components/metrics/MetricsPanel.tsx` | Passes `ownScore` to `AggregateRow`; row renders a violet tick on the team-average bar at own % position and `you · NN` line |
| `src/components/room/RoomBoard.tsx` | `prefilledActionContent` state, `handleConvertCardToAction`, `facilitatorOpen` state, `g f` shortcut, `onReopenRoom` and `onOpenFacilitator` propagation |
| `src/components/room/RoomHeader.tsx` | `onReopenRoom`, `onOpenFacilitator` props; "Past retros" pill (Wave 1.5), Reopen pill, AI prompt button with copy-to-clipboard, Guide button |

### Commit history (this drop)

- `feat(room): everyone is SM by default + reopen closed rooms (2.4)` (eb0ea99)
- `fix(board): viewport-bounded grid, per-card size toggle, portal reaction picker` (c96a00e)
- `feat(board): consensus heatmap + own-metric inline (waves 2.2 + 2.6)` (667575f)
- `feat(board): inline tag chip picker + card→action item conversion (waves 2.3 + 2.5)` (f5f3b42)
- `feat(export): AI-ready markdown prompt + facilitator panel (waves 3.1 + 3.5)` (e913c0c)

## 為什麼這樣做

### Shared facilitation by default

The original "first joiner = SM" model had a sharp UX failure: a Scrum Master refresh-or-reconnects, gets a new `participantId`, and silently demotes themselves. Beyond that one bug, the role is also performative for most teams — the "SM" controls (export, close, action items) aren't sensitive enough to need restriction. The cleanest fix is to delete the role gate entirely. We keep the `is_scrum_master` column in the schema (cheaper than a migration to remove it) but always write `1`, and a one-time backfill brings legacy rows along.

### Consensus visualisation as a glance

A vote count alone (`8`) doesn't tell you anything without context — 8 / 12 is loud, 8 / 50 is barely a whisper. By computing a ratio against participant count and bucketing into three named levels, the board lights up with where the team agrees and where it's split, without naming any individual voter. The colour cue (mint / amber / neutral) reuses the design system's section accents so it feels native.

### Per-card large size as override

Compact density is great for scanning many cards, but sometimes one card has a long story to tell during discuss. Adding a per-card `data-size` toggle (with CSS specificity higher than the compact-density block) gives the user a quick local override without abandoning compact globally. Selectors deliberately combine `[data-density="compact"] .sticky-card[data-size="large"]` to win in both density modes.

### Portal-rendered reaction picker

The `.sticky-card` (and any `.glass`) uses `backdrop-filter`, which CSS spec quietly turns into a containing block for fixed-positioned descendants. Net effect: the picker's `top` / `left` were measured in viewport coordinates but rendered relative to the card. Solution is to portal it to `document.body`, where there's no inherited containing-block rabbit hole.

### Inline tag chips

The "tags" toggle button was a discoverability tax — many users never realised tags existed. Putting chips inline (only when the composer has focus) trades a bit of vertical space for visibility. The "+ tag" pill replaces the "new tag panel" with an inline `# name [add]` micro-input, keeping the vertical rhythm of the form intact.

### Card → action item bridge

Before: type the card content, finish the discussion, scroll to action items, type it again. Now: click one icon. The handler ships `card.content` up to `RoomBoard`, which swaps the sidebar tab and stores `prefilledActionContent` for one render. `ActionItemForm` consumes it via useEffect (auto-opens, populates description) and immediately notifies the parent to clear so a later unrelated re-render doesn't refire.

### AI export as paste-bridge, not API call

The roadmap's plan for AI synthesis was an internal API integration (Claude Haiku-class model, prompt caching, summary table). The constraint surfaced during planning: the company doesn't have a sanctioned AI API to call from this app. Rather than abandon the feature, we shifted from "API integration" to "paste bridge": ship a prompt + content payload that any AI tool the user has access to can ingest. Cost: a button click. Benefit: works with whatever AI the team is allowed to use, including future internal tools we don't have to integrate against.

### Facilitator guide as static content

The facilitator panel deliberately doesn't ship phase logic (that's Wave 2.1). It renders five static sections and lets the SM tab between them at their own pace. Static content has zero ops complexity and zero TypeScript surface — `prompts.ts` is just a typed array. If we later add real phase tracking, the panel can subscribe to the active phase and pre-select the matching tab.

## 怎麼運作的

### Convert-card → action item flow

```
[Card]               [RoomBoard state]                    [Sidebar]
  │
  │ click ✅
  ├─→ onConvertToAction(card.content)
                        │
                        │ setSidebarTab('actions')
                        │ setPrefilledActionContent(content)
                        │
                        ├──── re-render ────→ ActionItemList
                                                  │
                                                  │ prefilledContent="…"
                                                  │
                                                  ├─→ ActionItemForm
                                                       │ useEffect on prefilledContent
                                                       │   - setDescription(content)
                                                       │   - setIsOpen(true)
                                                       │   - onConsumePrefill()
                                                       │       │
                                          setPrefilledActionContent('')  ←─┘
```

The clear-on-consume pattern matters: without it, an unrelated re-render later (e.g. a new card arrives via socket) would re-fire the useEffect and re-populate the form even after the user had cleared it.

### Consensus computation

```ts
const denom = Math.max(1, participantCount);
const ratio = Math.min(1, voteCount / denom);
const pct = Math.round(ratio * 100);
const level = pct >= 70 ? 'strong' : pct >= 40 ? 'mixed' : 'weak';
```

Capped at 100 % in case `voteCount > participantCount` due to a participant leaving mid-retro (their old vote still counts but the denominator just shrunk). `Math.max(1, …)` guards the empty-room edge.

### Reopen room socket dance

```
[SM clicks Reopen]
         │
         │ emits ROOM_REOPEN
         ▼
[Server room.handler.ts]
         │ checks data.isScrumMaster (now always true)
         │ roomRepo.reopen(roomId)  ← UPDATE rooms SET status='active', closed_at=NULL
         │
         │ io.to(roomId).emit(ROOM_REOPENED, { room })
         ▼
[All clients useRoom.ts]
         │ on ROOM_REOPENED:
         │   setRoom(prev => ({ ...prev, status: 'active', closedAt: null }))
         │   toast: "The room has been reopened."
```

### AI prompt copy

```
[Header click "Copy AI prompt"]
         │
         ├─→ fetch /api/rooms/{id}/export?format=ai
         │     server: buildAiSummaryMarkdown(room, cards, tags, actions, count)
         │     200 text/markdown body
         │
         ├─→ navigator.clipboard.writeText(text)
         │     (try/catch: clipboard API can fail in iframes / insecure context)
         │
         └─→ setAiCopied(true) → 2.2s timer → setAiCopied(false)
```

Failures are silent on purpose — clipboard is finicky and a noisy error toast is worse than the user trying again.

## 怎麼使用

### Open the facilitator panel programmatically

```tsx
const [open, setOpen] = useState(false);
<button onClick={() => setOpen(true)}>Guide</button>
<FacilitatorPanel open={open} onClose={() => setOpen(false)} />
```

### Compute consensus elsewhere

```ts
import { computeConsensus } from '@/lib/util/consensus';
const { pct, level, label } = computeConsensus(8, 12); // -> { pct: 67, level: 'mixed', label: '8/12 · 67%' }
```

### Add a stage to the facilitator guide

Append to `FACILITATOR_STAGES` in `src/lib/facilitator/prompts.ts`. The drawer auto-renders the new tab.

```ts
{
  key: 'icebreaker',
  title: 'Icebreaker',
  emoji: '☕',
  duration: '2 min',
  goal: 'Warm up the room before serious work begins.',
  tips: [...],
  prompts: [...],
}
```

If you add a new stage, also widen the `FacilitatorStage['key']` union to include it (TypeScript will guide you).

### Trigger a card→action conversion from your own component

Pass `onConvertToAction={(content) => setPrefilledActionContent(content)}` through the same prop chain. The handler must also flip the sidebar to the actions tab.

## 注意事項

- **Migration runs on every server boot.** `UPDATE participants SET is_scrum_master = 1 WHERE is_scrum_master = 0` is idempotent and cheap (only touches the rare 0 rows). If we ever want to revoke shared SM, that migration line should be removed first or it will keep re-applying.
- **Consensus denominator can drift.** `participantCount` reflects the count *right now*, not the count when votes were cast. If five people vote and two leave, `5/3 = 100 %` (capped). Acceptable trade-off for an anonymous tool — we don't track per-vote timestamps.
- **AI prompt body grows linearly with card count.** A retro with 200 cards produces a ~30 KB markdown payload. Most clipboards handle this; really large retros may exceed paste limits in some web AI inputs (usually generous). If we hit that ceiling, switch to download-then-upload flow.
- **`backdrop-filter` containing-block trap is global.** Anything else we render inside `.glass` / `.sticky-card` with `position: fixed` will trip on the same issue. Default to portals for any popover that escapes its parent visually.
- **FacilitatorPanel uses a hard-coded 420 px max width.** Acceptable on 1440 p+; on narrower windows it consumes ~30 % of viewport. Out-of-scope per the desktop-only directive, but worth noting if we ever revisit responsive design.
- **Anonymous invariants intact.** Every change in this drop was reviewed against the rule "no API or socket payload reveals individual participant_id / nickname / vote / score". Spot checks: consensus uses ratio only; own-score is sessionStorage-derived; convert-to-action carries content not author; AI prompt body uses revealed-only author names (existing rule).

## 驗證

- `next build` clean (verified incrementally during the session)
- Reopen flow: room status round-trips active → closed → active without losing cards or action items
- Consensus pill: `4 votes / 6 participants → 67% amber border + pill`; verified at `1440x900` viewport
- Per-card size: `data-size="large"` overrides `data-density="compact"` (verified `padding: 18px 18px 14px; font-size: 15px;`)
- Reaction picker: portals to `<body>`, position fixed at correct viewport coordinates (verified parent chain via DOM eval)
- AI prompt: `format=ai` returns 200 with `text/markdown` and prompt header is present
- Facilitator panel: opens via button + `g f` chord; closes via Esc + click-outside; tab switching swaps content
- Migration: existing SM=0 rows in dev DB updated to 1 on next server boot

## Related

- Plan: `~/.claude/plans/ui-ux-retro-purring-feather.md`
- Predecessor changelog: `docs/changelog/2026-05-01-wave1-desktop-polish.md`
- Predecessor technical: `docs/technical/wave1-desktop-polish.md`
- This drop changelog: `docs/changelog/2026-05-01-wave2-wave3-shipped.md`
- This drop usage: `docs/usage/wave2-wave3-shipped.md`
