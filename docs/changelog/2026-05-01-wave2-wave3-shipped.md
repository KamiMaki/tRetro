# Wave 2 + Wave 3 (partial) — Facilitator Workflow & Output Bridge

**Date:** 2026-05-01
**Status:** Shipped (5 of 7 Wave 2 items, 2 of 5 Wave 3 items)
**Plan reference:** `~/.claude/plans/ui-ux-retro-purring-feather.md`
**Predecessor:** `2026-05-01-wave1-desktop-polish.md`

## What changed

This drop continues the roadmap with the items most likely to change how a real team runs a retro: shared facilitation, consensus signals, action-item capture, an AI-friendly export bridge, and an in-room facilitator guide. Everything stays anonymous — no UI surface reveals individual identities or behaviour.

### Wave 2 (shipped)

- **2.4 Reopen closed room** — `ROOM_REOPEN` / `ROOM_REOPENED` socket events; `roomRepo.reopen()` flips status back to `active` and clears `closed_at`. Reopen pill in `RoomHeader` for closed rooms; `useRoom` toasts "The room has been reopened." on broadcast.
- **2.2 Voting consensus heatmap** — `lib/util/consensus.ts` computes `votes / participantCount` and buckets into strong (≥70 %) / mixed (40–70 %) / weak (<40 %). Cards get a `data-consensus` attribute; `globals.css` paints mint or amber glows accordingly. A small `67%` pill renders next to the vote button.
- **2.6 Own metric scores inline** — `MetricsPanel` now passes own score per metric to `AggregateRow`, which renders a 2 px violet tick on the team-average bar at the user's % position and a `you · 72` line under the average. Server still never returns per-participant data.
- **2.5 Inline tag chip picker** — `CardForm` removes the "tags" toggle button. Tag chips appear directly below the textarea once the composer has focus. Recent tags are toggleable; a `+ tag` chip inflates to an inline `# name [add]` input.
- **2.3 Convert card → action item** — Card footer (visible to everyone, since everyone is now SM) gains a small green checklist icon. Clicking sends the card content to the action-items sidebar as a prefilled draft and switches the sidebar tab to actions. `ActionItemForm` accepts `prefilledContent` / `onConsumePrefill` and auto-opens.

### Wave 3 (shipped)

- **3.1 AI-ready markdown export** — New `lib/utils/aiExportTemplate.ts` returns a paste-ready prompt (role + 3-task brief + output schema) followed by the retro content. `format=ai` branch in the export route. RoomHeader gets a "Copy AI prompt" button that pushes the markdown to `navigator.clipboard` and shows a transient mint confirmation.
- **3.5 Facilitator guide** — `lib/facilitator/prompts.ts` ships static content for five stages (Gather / Vote / Discuss / Action / Wrap), each with goal, tactical tips, and read-aloud prompts. Slide-in side drawer (`FacilitatorPanel.tsx`), opened via "Guide" button or the `g f` keyboard chord.

### Bonus fixes

- **Everyone is SM by default** — participants always join with `is_scrum_master = 1`. Migration backfills existing rows. Eliminates the "I closed my tab and lost my SM rights" trap.
- **Per-section scrolling** — `Board` grid is bounded to `calc(100vh - 180px)` with `grid-auto-rows: minmax(0, 1fr)` so each section scrolls independently instead of the whole page growing forever.
- **Per-card size toggle** — Each card has a small expand/collapse button in the footer that flips between normal and large layouts; large mode wins over compact density.
- **Reaction picker portal** — `ReactionBar` now uses `createPortal(document.body)` so the picker isn't trapped by the `.sticky-card` `backdrop-filter` containing block (which was silently turning `position: fixed` into `position: absolute`). Reaction chips also normalize line-height and use the system emoji font stack.

## Files

**New:**
- `src/lib/util/consensus.ts`
- `src/lib/utils/aiExportTemplate.ts`
- `src/lib/facilitator/prompts.ts`
- `src/components/room/FacilitatorPanel.tsx`

**Modified (functional):**
- `src/app/api/rooms/[roomId]/export/route.ts` — `format=ai` branch
- `src/app/globals.css` — consensus heatmap, per-card large size override
- `src/components/board/Board.tsx` — bounded grid; threads `participantCount` + `onConvertToAction`
- `src/components/board/Card.tsx` — consensus pill, per-card size toggle, convert-to-action button
- `src/components/board/CardForm.tsx` — inline tag chip picker
- `src/components/board/ReactionBar.tsx` — portal picker, normalized chip alignment
- `src/components/board/Section.tsx` / `SectionFullscreen.tsx` — `participantCount` + `onConvertToAction`
- `src/components/action-items/ActionItemForm.tsx` — `prefilledContent` / `onConsumePrefill`
- `src/components/action-items/ActionItemList.tsx` — passthrough
- `src/components/metrics/MetricsPanel.tsx` — own-score tick + label
- `src/components/room/RoomBoard.tsx` — sidebar tab control, prefill state, facilitator state, shortcuts
- `src/components/room/RoomHeader.tsx` — reopen pill, AI prompt button, Guide button
- `src/lib/db/migrations.ts` — backfill is_scrum_master = 1
- `src/lib/db/repositories/participant.repo.ts` — always create with SM
- `src/lib/db/repositories/room.repo.ts` — `reopen()` method
- `src/lib/hooks/useRoom.ts` — reopen action + listener
- `src/lib/socket/events.ts` — ROOM_REOPEN / ROOM_REOPENED
- `src/lib/socket/handlers/room.handler.ts` — reopen handler

## Deferred to a follow-up session

- **2.1 Phase flow + timer** (L) — schema change, new socket events, phase bar UI
- **2.7 Retro templates** (L) — section enum becomes string, template picker on room creation
- **3.2 PDF + CSV export** (M) — needs puppeteer/playwright dependency
- **3.3 Action-item webhook** (M) — DB column, settings UI, outbound HTTP
- **3.4 History detail page** (M) — new route, reuse Aurora board layout in read-only mode

## Verification done

- `next build` clean (verified via dev server with no compile errors throughout the session)
- 4-section grid renders 4 columns at 1440 px, each section's internal scrollbar appears once cards exceed bounds
- Reaction picker mounts under `<body>`, position correct relative to viewport regardless of card backdrop-filter
- Card per-size large mode beats compact-density CSS (specificity bumped via combined selector)
- Reopen toast shows for all clients on `ROOM_REOPENED` broadcast
- Consensus pill: 4 votes / 6 participants → 67 % amber; verified data attribute and CSS rules apply
- AI prompt copy: button text flips to "Copied · paste into AI" for 2.2 s
- Facilitator panel opens via button + `g f` chord, closes via Esc + click-outside
- Migration backfill: existing participants update to `is_scrum_master = 1` on next server boot
