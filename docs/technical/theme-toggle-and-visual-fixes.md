# Theme toggle + Aurora visual fixes — technical document

Companion doc to commit `feat(theme): add dark/light toggle and fix
Aurora visual bugs` (2026-05-01). Read this if you need to extend
theming, change the z-index hierarchy, or debug why a popover lands in
the wrong place.

## What changed

### Files added
- `src/lib/hooks/useTheme.ts` — theme state hook with localStorage persistence.
- `src/components/ui/ThemeToggle.tsx` — pill button that toggles the theme.

### Files modified (theme infrastructure)
- `src/app/layout.tsx` — adds the no-flash inline script.
- `src/app/globals.css` — light-mode contrast + sticky-card light variants + button overrides + select/date field polish + `.modal-backdrop` utility + z-index legend.

### Files modified (visual fixes)
- `src/components/board/ReactionBar.tsx` — picker rebuilt as fixed popover, reaction pills get aria-label.
- `src/components/board/DrawingModal.tsx`, `src/components/board/DrawingThumbnail.tsx`, `src/app/page.tsx` (NewRoomModal) — switched to `.modal-backdrop` class.
- `src/components/room/RoomHeader.tsx`, `src/app/room/[roomId]/history/page.tsx` — themed glass header bg + ThemeToggle wired in.
- `src/app/room/[roomId]/join/page.tsx` — floating ThemeToggle.
- `src/components/ui/Toast.tsx` — theme-aware bg/colour.
- `src/__tests__/e2e/retro-board.spec.ts` — copy updates + 2 new tests.

### Files NOT touched
- All server code, all socket handlers, all DB code.
- Existing card/section/board logic.

## Why this design

### 1. No-flash theme load via inline script

A React hook can't read `localStorage` until after hydration. If we
applied the theme inside `useEffect`, every page load would briefly
flash the wrong theme. The fix is a single inline `<script>` in
`<head>` (in `layout.tsx`) that runs synchronously, reads the stored
theme, and writes `data-theme` + `style.colorScheme` on `<html>` before
React mounts.

```tsx
const NO_FLASH_THEME = `
(function() {
  try {
    var t = localStorage.getItem('tretro-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;
```

`suppressHydrationWarning` is set on `<html>` and `<body>` so React
doesn't complain that the server-rendered attributes don't match the
client (the script changes them before hydration runs).

### 2. Hook reads the attribute, not localStorage

`useTheme` reads `data-theme` from `<html>` first, falling back to
`localStorage`. This works because the inline script has already
applied the right value, so React state and DOM agree on the first
render after hydration.

```ts
function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const fromAttr = document.documentElement.getAttribute('data-theme');
  if (fromAttr === 'light' || fromAttr === 'dark') return fromAttr;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}
```

### 3. CSS variables flip everything

Because the entire Aurora design system is parameterised on CSS
variables (see the previous Aurora design system tech doc), switching
themes is just `data-theme="..."` — no React re-render of components,
no class swap.

### 4. Light-mode sticky cards

The original Aurora gradients used very low alpha values
(`oklch(... / 0.30)`) over a dark background. On a near-white light bg
those become invisible washes. Light mode gets its own gradient stops
that go from a moderately-saturated mid-tone to a near-white tinted
end, so the card still reads as "mint" or "pink" but on white.

```css
[data-theme="light"] .sticky-card[data-tone="mint"] {
  background: linear-gradient(160deg,
    oklch(0.82 0.16 175 / 0.45),
    oklch(0.96 0.04 175 / 0.85));
  border-color: oklch(0.55 0.16 175 / 0.4);
}
```

### 5. Emoji picker as portal-style popover

The original implementation used `position: absolute; bottom: 30px;
left: 0` inside a `position: relative` wrapper. This creates two
problems:

- **Stacking context confusion** — the `.sticky-card` and the column
  header are siblings under the section panel. The picker, being
  inside the card, was painted in the card's stacking context. When
  the picker pops up above the card it overflows into the column
  header's space, and depending on z-index ordering the picker
  appears under the column header.
- **Overflow clipping** — when the column has `overflow-y: auto`, any
  picker that pops up past the top of the card is clipped.

The new picker uses `position: fixed` with coordinates calculated from
the trigger button's `getBoundingClientRect()`:

```ts
const r = btn.getBoundingClientRect();
let top = r.top - PICKER_H - 6;
let left = r.left;
if (top < 8) top = r.bottom + 6;          // flip below if no room above
if (left + PICKER_W > window.innerWidth - 8)  // clamp to right edge
  left = window.innerWidth - PICKER_W - 8;
if (left < 8) left = 8;                   // clamp to left edge
```

This breaks out of every parent stacking context (because `fixed`
positioning is relative to the viewport and creates its own context
with the higher z-index), so the picker can never be clipped by
column overflow or hidden by the column header.

A side effect: scroll events used to auto-close the picker, which
broke Playwright's "scroll into view" stability check. The auto-close
listeners are now resize + Escape only, never scroll.

### 6. Unified modal backdrop

The dashboard's `NewRoomModal`, `DrawingModal`, and the
`DrawingThumbnail` lightbox each had their own copy-pasted backdrop
styles with slightly different z-indexes (50, 60, 60). They all now
use the `.modal-backdrop` class with documented stacking:

```
sticky page header  = 20
reaction popover    = 70-71
modal backdrop      = 80
modal panel         = 81
drawing/lightbox    = 82  (data-z="lightbox")
toast               = 100
```

This means a drawing modal opened over the board is always above any
other modal that might somehow be open, but a toast is still above
even a drawing modal so users see error feedback.

### 7. Reaction pill aria-label

The reaction pill (`<button title="Remove 🔥">🔥 1</button>`) used
`title` for the tooltip but had no `aria-label`. By the WAI ARIA spec,
the button's accessible name is its text content (`"🔥 1"`), not its
title. So `getByRole('button', { name: /Remove 🔥/ })` could never
find it. Adding `aria-label="Remove 🔥 reaction (1)"` fixes both
screen-reader UX and Playwright targeting.

## Code patterns

### Reading the current theme inside a component

```tsx
import { useTheme } from '@/lib/hooks/useTheme';

function MyComponent() {
  const { theme } = useTheme();
  return <div>Currently in {theme} mode</div>;
}
```

Don't use this for styling — use CSS variables instead. Use it only
when you need to render different *content* per theme.

### Building a new modal

```tsx
function MyModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 81 }}>
        <GlassPanel strong style={{ padding: 24 }}>
          {/* content */}
        </GlassPanel>
      </div>
    </div>
  );
}
```

For a "lightbox over a modal" case (e.g. drawing canvas opened from a
card detail), pass `data-z="lightbox"` to the backdrop and use
`zIndex: 82` on the panel.

### Building a popover (like the emoji picker)

Use `position: fixed` + `getBoundingClientRect()` of the trigger.
Always clamp to viewport. Use `zIndex: 70-71` so you sit above the
sticky page header but below modals.

## Testing

E2E coverage gained two new tests:

- **`should toggle theme between dark and light`** — clicks the
  toggle, verifies `data-theme` flips, reloads to verify
  `localStorage` persistence, toggles back.
- **`emoji reaction picker should not overflow card`** — joins a
  room, posts a card, opens the picker, verifies it has the dialog
  role and is visible, picks 🔥, verifies the reaction pill appears
  with the correct aria-label.

All 13 tests pass locally:
```
13 passed (47.8s)
```

## Caveats

- **`suppressHydrationWarning`** on `<html>` and `<body>** — required
  because the inline script mutates `data-theme` and `style.colorScheme`
  before React hydrates. Without it React would throw "hydration
  mismatch" on every load. Don't use this attribute elsewhere — it
  silences legitimate bugs.
- **The picker's `useEffect` does not auto-close on scroll** — only on
  resize and Escape. This was deliberate (Playwright was triggering
  scroll-into-view which then closed the picker mid-test). If we ever
  want scroll-to-dismiss behaviour, we'd need to gate it on a non-
  programmatic-scroll heuristic (e.g. `event.isTrusted`).
- **Reaction pill `aria-label` is verbose** — `"Remove 🔥 reaction (3)"`
  vs the previous `"🔥 3"`. This is intentional for a11y. Screen
  readers now announce the action + count clearly.
- **`color-scheme: dark/light`** is set on `<html>` so native form
  controls (date pickers, scrollbars, autofill backgrounds) match the
  theme. If we ever ship a third theme, this needs updating too.

## Future work

- **System-default theme** — add a third option `system` that listens
  to `prefers-color-scheme: dark` via `matchMedia`. Currently a user
  must explicitly pick. The default is hardcoded to `dark`.
- **Theme picker on mobile** — the toggle takes ~80px width which is
  fine on desktop but tight in a mobile header. Consider an icon-only
  variant under a breakpoint.
- **Reaction picker animation** — currently `fade-in 0.18s`. A spring
  scale-from-trigger animation would feel nicer (similar to the
  iOS/Apple Messages reaction picker).
