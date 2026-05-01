# Wave 1 — Desktop Polish & Information Density

**Date:** 2026-05-01
**Status:** Shipped
**Plan reference:** `~/.claude/plans/ui-ux-retro-purring-feather.md` (Wave 1)

## What changed

A round of nine improvements focused on making the desktop experience tighter and more discoverable, without touching mobile (which is explicitly out of scope per the approved plan).

### Layout & Information Density

- **RoomBoard sidebar (1.1)** — On screens ≥ 1100px, the main board now sits next to a sticky right sidebar (380px) that contains tabbed Action items + Sprint metrics. Below 1100px, the sidebar stacks below the board.
- **Density toggle (1.8a)** — A "compact / cozy" button in `RoomHeader` toggles `data-density` on `<html>`. Compact mode shrinks card padding and collapses the card footer until hover. Preference persists in localStorage.
- **Section fullscreen (1.8b)** — Each board section now has a fullscreen button. Clicking it opens a portal overlay that renders all cards in a 4–6 column grid, with the card composer pinned at the bottom. Useful for browsing, dedup checks, and one-section-at-a-time discussion. Esc closes.
- **Dashboard density (1.9)** — Room cards now show a 4-column emoji preview of section card counts, and a "active 5m ago" relative timestamp computed from the latest card / comment / action item. Grid minimum bumped from 260px to 300px so 1440p+ screens can fit four to five cards per row.

### Discoverability

- **Past retros link (1.5)** — `RoomHeader` now shows a "Past retros" pill next to the room name. Links to `/?status=closed`, and the dashboard reads the query param so the closed filter applies automatically.
- **Back to dashboard on /join (1.6)** — A back button in the top-left of `/join` so accidental landings have an out.

### A11y & Keyboard

- **Focus-visible rings (1.2)** — Universal `:focus-visible` outline + soft halo on buttons, fields, tabs, toggles. Mouse focus stays subtle; keyboard focus is unmistakable.
- **Spacing tokens (1.4)** — `--space-1..6` and `--avatar-sm/md/lg` CSS variables centralize the magic numbers that were scattered through inline styles.
- **Date input theme (1.7)** — Replaced `filter: invert` workaround with `color-scheme: light dark`; native picker now follows the active theme.
- **Keyboard shortcuts (1.3)** — Global shortcuts via the new `useShortcuts` hook with chord support. Press `?` anywhere to open the cheatsheet overlay.
  - **Dashboard:** `/` focus search · `N` new retro · `?` help
  - **Room:** `N` focus composer · `A`/`M` switch sidebar tab · `G H` past retros · `G D` dashboard · `?` help

## Files

**New:**
- `src/lib/hooks/useShortcuts.ts`
- `src/lib/hooks/useDensity.ts`
- `src/components/ui/KeyboardHelp.tsx`
- `src/components/board/SectionFullscreen.tsx`

**Modified:**
- `src/app/globals.css` — tokens, focus rings, density rules, fullscreen overlay
- `src/app/page.tsx` — dashboard card density, section preview, shortcuts
- `src/app/room/[roomId]/join/page.tsx` — back button
- `src/components/board/Card.tsx` — `card-footer` class
- `src/components/board/Section.tsx` — fullscreen button
- `src/components/room/RoomBoard.tsx` — sidebar layout, tabs, shortcuts
- `src/components/room/RoomHeader.tsx` — Past retros link, density toggle
- `src/lib/db/repositories/room.repo.ts` — section counts + last activity SQL
- `src/lib/types/index.ts` — `RoomSummary.sectionCounts` and `lastActivityAt`

## Non-goals

- Mobile responsive design (explicit out-of-scope; all retros happen on desktop)
- Anonymous-violating signals (no "who is typing" or per-user vote disclosure)
- AI integrations (deferred to Wave 3.1: AI-ready markdown export instead)

## Follow-ups

Continues with Wave 2 (facilitator workflow + phase flow) per the approved roadmap.
