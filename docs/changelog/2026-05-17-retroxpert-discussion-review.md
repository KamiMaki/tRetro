# 2026-05-17 — RetroXpert rename + Discussion & Review tabs

## Summary

Implements the latest Claude Design handoff (`7d3FQ2TwUK9XQhIDhDLWFw`,
chat *"RetroXpert Icon設計"*). Two things ship together:

1. **Rename** — the product is now **RetroXpert** (was tRetro). New logo: a
   gradient liquid-glass tile with an `RX` monogram + a `Retro` / gradient-`X` /
   `pert` wordmark.
2. **Discussion & Review tabs** — the room gains two new tabs that re-introduce
   the SM facilitation flow removed in `bdb1f63`, split into the two modes the
   design calls *Focus* and *Overview*:
   - **Discussion (討論)** — Focus mode: walk cards one tag-group at a time.
   - **Review (檢視)** — Overview mode: every card across all 4 sections
     expanded at once, with one-click expand/collapse of all comment threads.

## What changed

### Added
- `src/components/discussion/DiscussionPanel.tsx` — Focus walkthrough. Tag-group
  rail, 3-column layout (card queue · focused card · comment viewer), Prev/Next.
  Two decisions per card: **Action item** (creates a real, persisted action
  item — once per card, no duplicates) and **Park** (local amber marker). The
  left column is a clickable card-preview queue; the right column shows the
  focused card's comments and lets you post new ones inline. Drawings on the
  focused card are viewable.
- `src/components/discussion/ReviewPanel.tsx` — Overview. Toolbar (stats, tag
  filter, expand-all toggle), 4 stacked sections with colored bands, inline
  comment threads, and drawing thumbnails. A pure read/triage surface — no
  decision controls.

### Changed
- `src/components/ui/Aurora.tsx` — `Logo` is now the RetroXpert mark (`RX`
  monogram tile + gradient wordmark). Accepts a `wordmark` prop. Gradient ids
  are per-instance via `useId()` so multiple logos don't collide.
- `src/components/room/RoomBoard.tsx` — `MainTab` gains `discussion` and
  `review`; two tabs render between Board and Action items. Keyboard shortcuts
  `d` (Discussion) and `r` (Review) added to the shortcut map + help panel.
- `src/app/layout.tsx` — page `<title>` → RetroXpert.
- `src/app/page.tsx` — dashboard hero → "Welcome back to RetroXpert".
- `src/app/login/page.tsx` — gate copy → RetroXpert.
- `package.json` — package name → `retroxpert-app`.
- `README.md` — title + intro.

## Why

The previous SM discussion mode was dropped during a board refactor. The design
team re-specced it as **two distinct surfaces** rather than one screen: a
guided *Focus* walkthrough for live facilitation, and an *Overview* that the
whole team can use to read every card and its comments in one scroll. Exposing
them as room tabs (rather than a separate route) keeps them one click away from
the board and reuses the existing socket-backed card data.

## How it works

Both panels render over `useRoom().cards` — no new socket events, no schema
changes. The Focus **Park** marker is local, session-only React state. The two
surfaces that *do* reach the backend reuse existing events: comment threads
(both panels) post through `comment:create` via the shared `CommentList`, and
the Focus **Action item** button calls the existing `addActionItem` so a real
action item lands in the Action items tab. Drawing thumbnails reuse
`DrawingThumbnail` in its view-only mode.

## Verification

- `npx tsc --noEmit` — 0 errors
- `npx eslint` (new files) — 0 errors (1 unrelated pre-existing warning in RoomBoard)
- `npm run build` — succeeds; all routes compile
- Manual: created a room, added 6 cards + a drawing, confirmed Review expand-all
  reveals all comment threads and has no decision row, comment posting updates
  the toolbar stats; Discussion Focus shows the tag-group rail, the card queue,
  Prev/Next, the comment viewer on the right, Action item creating a real
  action item (Action items badge 0→1, no duplicate on re-click), the amber
  Park button, and drawings opening in the lightbox.

## Caveats

- The Focus **Park** marker is intentionally session-only — not persisted,
  reset on reload. **Action item** is the exception: it creates a real,
  persisted action item.
- With no tags created, every card lands in a single `untagged` Focus group;
  this is expected. Tag groups appear once cards carry tags.
- The in-app verification used text snapshots — the screenshot tool times out
  rasterising the heavy aurora `backdrop-filter`, so no screenshot is attached.

## Source

Design extracted from Claude Design handoff bundle:
`https://api.anthropic.com/v1/design/h/7d3FQ2TwUK9XQhIDhDLWFw?open_file=tRetro.html`
(screens `screen-discussion.jsx`, `ui-atoms.jsx`).
