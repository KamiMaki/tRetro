# 2026-08-04 — Interactive discussion: cheers, combos, presenter focus sync, card heat, richer Summary Prompt

## Summary

Discussion mode gains five room-wide, real-time layers on top of the existing
focus walkthrough: ephemeral emoji "cheers" any participant can fire at the
focused card, a "combo" escalation when the room cheers together, a
presenter-claim model so everyone's card view can sync to one person's
walkthrough, a heat glow that marks the cards a room actually talked about,
and a Summary Prompt that asks the AI for seven analysis sections instead of
three. Cheers and combos are pure in-memory broadcasts — nothing is written
to the database.

## What changed

### New
- `src/lib/socket/handlers/cheer.handler.ts` — `cheer:send` → `cheer:burst`
  (+ `cheer:combo` on escalation). Sliding-window rate limit, combo
  detection, per-card cheer tally.
- `src/lib/socket/handlers/focus.handler.ts` — `focus:claim` / `focus:release`
  / `focus:set` → `focus:updated`. Presenter-claim state machine.
- `src/lib/socket/focus-store.ts` — in-memory "who is presenting, on which
  card" per room, keyed by socket id so a stale disconnect can't free a room
  a new claim already holds.
- `src/lib/utils/heat.ts` — `heatScore`, `heatLevel`, `cardHeatClass`;
  exports `HEAT_WARM_SCORE` (6) and `HEAT_HOT_SCORE` (12).
- `src/components/discussion/CheerBurst.tsx` — renders one cheer/combo as an
  independent, self-cleaning particle burst (`full` / `compact` / `mega`
  sizes, four animation archetypes).
- `src/__tests__/unit/socket/cheer.handler.test.ts`,
  `src/__tests__/unit/socket/focus.handler.test.ts`,
  `src/__tests__/unit/utils/heat.test.ts` — new unit coverage.

### Modified
- `src/lib/socket/events.ts` — added `FOCUS_CLAIM` / `FOCUS_RELEASE` /
  `FOCUS_SET` / `FOCUS_UPDATED` and `CHEER_SEND` / `CHEER_BURST` /
  `CHEER_COMBO`.
- `src/lib/socket/handlers/limits.ts` — added `CHEER_EFFECT_VALUES` +
  `isValidCheerEffect`, the cheer rate-limit constants
  (`CHEER_RATE_MAX`/`CHEER_RATE_WINDOW_MS`), and the combo constants
  (`COMBO_WINDOW_MS`/`COMBO_MIN_CHEERS`/`COMBO_MIN_PARTICIPANTS`/
  `COMBO_COOLDOWN_MS`).
- `src/lib/socket/handlers/room.handler.ts` — `room:joined` now includes
  `focusState` (current presenter + card, or `null`) so late joiners see the
  walkthrough already in progress.
- `src/lib/socket/server.ts` — registers `registerCheerHandlers` and
  `registerFocusHandlers` alongside the other per-connection handlers.
- `src/lib/types/index.ts` — added `CheerEffect`, `SendCheerPayload`,
  `CheerBurstPayload`, `LiveCheer`, `CheerComboPayload`, `LiveCombo`,
  `RoomFocusState`, `FocusUpdatedPayload`.
- `src/lib/hooks/useRoom.ts` — client-side cheer/combo queues (TTL + max-live
  caps), `presenterId` / `facilitatorFocus` state driven by `focus:updated`,
  and `sendCheer` / `setFocus` / `claimPresenter` / `releasePresenter`
  emitters.
- `src/components/room/RoomBoard.tsx` — wires the new `useRoom` values into
  `DiscussionPanel`, including `isActive={activeTab === 'discussion'}`.
- `src/components/discussion/DiscussionPanel.tsx` — cheer bar, live burst
  layers (focused card + corner float for other cards), combo overlay,
  presenter controls (主持討論 / 接手主持 / 停止主持), the 跟隨主持人 switch
  and 回到主持人 pill, and `cardHeatClass` on both the queue and the
  focused card.
- `src/components/board/Card.tsx` — board cards get `cardHeatClass` too, so
  heat is visible outside Discussion mode.
- `src/app/globals.css` — cheer particle keyframes (burst/rain/rise/shake +
  shockwave/tint/chip), combo backdrop pulse, heat breathing-glow keyframes,
  and their `prefers-reduced-motion` fallbacks.
- `src/lib/utils/aiExportTemplate.ts` — `DEFAULT_SUMMARY_PROMPT` rewritten
  from 3 to 7 analysis sections; per-card lines now include vote count and
  reaction summary; header block gains a 模式 (anonymous/named) line and a
  real participant-count line; an optional Sprint 指標 table is appended
  when submissions exist.
- `src/app/api/rooms/[roomId]/export/route.ts` — `format=ai` now loads
  per-card votes/reactions and the metric aggregate and passes them to
  `buildAiSummaryMarkdown`.
- `src/components/room/RoomHeader.tsx` — Summary Prompt copy button now
  surfaces a "Copy failed — retry" state instead of failing silently.
- `src/__tests__/unit/utils/aiExportTemplate.test.ts` — updated for the
  7-section prompt and the new per-card/header fields.

## Why

- **Cheers had to cost nothing to send and leave nothing behind.** A retro
  reaction is a mood, not a record — persisting it would mean moderating it,
  attributing it, and exporting it. Keeping cheers entirely in-memory
  (server tally, client TTL queue) means the feature can be as playful as it
  wants without becoming a second comment system.
- **The obvious focus-sync design — gate on the Scrum Master — doesn't fit
  this app.** `participant.repo.ts` deliberately makes *every* participant a
  Scrum Master (shared facilitation is the whole point of the room), so
  there's no single role to grant "presenter" to. The shipped model is a
  claim instead of a grant: anyone can take the wheel, the newest claim
  wins, and a presenter's own tab reload doesn't drop it out from under them
  (the claim is keyed to the presenting socket id, not just the
  participant).
- **Heat excludes votes and cheers on purpose.** Votes already have their
  own consensus ring — "this matters" is a different signal from "we
  discussed this". Cheers are one click each and fire in bursts, so any
  glow threshold built on them turns into spam bait; comments and reactions
  are the two signals that actually require someone to engage with a card.
- **The Summary Prompt only had 3 sections and asked nothing about mood,
  quiet cards, or action-item quality.** The 7-section version adds
  emotion/morale synthesis (tied to Sprint metric averages when present),
  a check for zero-vote/zero-comment cards, a system-vs-one-off split on
  risks, and an explicit action-item quality pass — closer to what a
  facilitator actually wants out of a pasted-into-ChatGPT summary.

## Verification

- `npm test` (jest) — `Test Suites: 31 passed, 31 total` / `Tests: 325
  passed, 325 total`.
- `npx tsc --noEmit` — exit 0.
- Two-participant manual browser verification:
  - Cheers: sent from participant B, animated on participant A's focused
    card; a card B was not focused on showed the compact corner float
    instead.
  - Combo: 3 same-effect cheers from 2 distinct participants inside 5s
    triggered the mega/backdrop version on both screens; a second combo of
    the same effect inside the 8s cooldown did not re-fire.
  - Presenter claim/follow/takeover/disconnect — 7-step walkthrough: claim,
    navigate (follower's view moves), follower manually navigates (pauses
    following, 回到主持人 appears), follower clicks it back to following,
    second participant 接手主持 (takeover, no confirmation needed), original
    presenter's tab closed (wheel auto-released), new claim after release
    all worked as designed.
  - Heat thresholds verified at exactly 6 (warm glow appears) and 12 (amber
    glow replaces it).

## Caveats

- See `docs/technical/interactive-discussion.md` for the full Caveats
  section — server-restart data loss for cheers/combos/presenter state, the
  heat exclusion rationale, reduced-motion behaviour, the unread
  `cardCheerTotal`/`count` payload fields, rate-limit map lifetime, and the
  active-tab-only rendering constraint.
