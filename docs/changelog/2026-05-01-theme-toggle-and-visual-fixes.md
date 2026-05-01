# Theme toggle + Aurora visual bug fixes — 2026-05-01

## Summary

Adds a working dark/light theme toggle to the Aurora liquid-glass UI and
fixes a cluster of visual bugs the user reported during E2E testing:
poor light-mode contrast, an emoji picker that overflowed cards, and
modal stacking conflicts where draw/card overlays could collide.

## What changed

### Added
- `src/lib/hooks/useTheme.ts` — `useTheme()` returns `{theme, setTheme, toggle, hydrated}` and persists to `localStorage` under `tretro-theme`.
- `src/components/ui/ThemeToggle.tsx` — pill-shaped glass button with sun/moon icon. Visible in dashboard, room board, history, and join headers.
- `src/app/layout.tsx` — inline `<script>` reads `localStorage.tretro-theme` BEFORE first paint and sets `data-theme` + `color-scheme` on `<html>`, eliminating the flash of wrong theme on hard refresh.

### Changed
- **`src/app/globals.css`**
  - Tightened light-mode tokens: `--fg-2/--fg-3` darkened, `--glass-bg-strong` raised to 0.85 opacity, `--glass-border` darkened.
  - Light-mode-only sticky-card gradients (mint/pink/violet/cyan/amber) so coloured glass reads correctly on white.
  - `.btn-primary` text: dark on dark theme, white on light theme (with text-shadow).
  - `.btn-ghost` colour overrides for both themes.
  - `select.field` — custom SVG dropdown arrow.
  - `input[type="date"].field` — invert calendar picker icon in dark mode.
  - Added `.modal-backdrop` + `.modal-backdrop[data-z="lightbox"]` utility classes with documented z-index hierarchy.
- **`src/components/board/ReactionBar.tsx`** — emoji picker rebuilt as a `position: fixed` portal-style popover (5×3 grid). Positions itself relative to the trigger button via `getBoundingClientRect`, clamps to viewport, flips below if no room above. Added `aria-label` to existing reaction pills so accessibility tooling (and Playwright `getByRole`) can find them.
- **`src/components/board/DrawingModal.tsx`** + **`DrawingThumbnail.tsx`** — switched to the unified `.modal-backdrop[data-z="lightbox"]` class.
- **`src/app/page.tsx` (NewRoomModal)** — uses `.modal-backdrop`.
- **`src/components/room/RoomHeader.tsx`** — themed glass background (was hard-coded dark colour); ThemeToggle inserted before Share button.
- **`src/app/room/[roomId]/history/page.tsx`** — themed glass header background; ThemeToggle inserted before Export buttons.
- **`src/app/room/[roomId]/join/page.tsx`** — ThemeToggle pinned to top-right corner.
- **`src/components/ui/Toast.tsx`** — coloured borders preserved per type, but body & background derive from theme variables (no more white-on-white in light mode); icon keeps the type tint via inline color.
- **`src/__tests__/e2e/retro-board.spec.ts`** — placeholders/labels updated for new design copy (`Drop a thought…`, `Send`, `Enter retro`, `New retro`, `reveal`). Added two new specs: theme toggle persistence, and emoji-picker visibility across cards.

### Z-index hierarchy (now documented in `globals.css`)

| Layer | z-index |
|---|---|
| Sticky page header | 20 |
| Reaction picker popover | 70–71 |
| Modal backdrop | 80 |
| Modal panel | 81 |
| Drawing/lightbox modal | 82 |
| Toast | 100 |

## Verification

- `npx tsc --noEmit` — passes
- `npm run build` — passes (6 routes)
- `npm run test:e2e` — **13/13 passing** (including 2 new tests):
  - Dashboard theme toggle persistence
  - Emoji picker rendered without overflow

## Manual visual verification

Tested at 1440×900, both themes:
- Dashboard: theme toggle reads correct state, board cards contrast, hue glows visible
- Join page: floating toggle works, glass card readable in both modes
- Board: 4-column accents preserved, sticky cards readable in light mode
- Reaction picker: opens above/below trigger as space allows, never overflows card or viewport
- Drawing modal: opens above board cleanly, can be closed by backdrop click
