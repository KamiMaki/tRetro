# Wave 1 Technical: Desktop Polish & Information Density

## 這次改了什麼 (What Changed)

### New files

| Path | Purpose |
|---|---|
| `src/lib/hooks/useShortcuts.ts` | Keyboard shortcut hook with chord support, input-target skip, configurable bindings |
| `src/lib/hooks/useDensity.ts` | Density preference (`comfortable | compact`) hook, localStorage-backed, applies `data-density` to `<html>` |
| `src/components/ui/KeyboardHelp.tsx` | Modal overlay listing all shortcuts (grouped by section), opens on `?`, closes on `Esc` |
| `src/components/board/SectionFullscreen.tsx` | Portal-based fullscreen overlay for a single board section |

### Modified files

| Path | Change |
|---|---|
| `src/app/globals.css` | New CSS tokens: `--space-1..6`, `--avatar-sm/md/lg`, `--focus-ring*`. Universal `:focus-visible` rules. Compact density rules. Section fullscreen overlay layout. Replace `filter: invert` on date input with `color-scheme: light dark`. |
| `src/app/page.tsx` | Dashboard reads `?status=closed` param. New `SectionBadge` sub-component for per-section card count preview. Bumps grid `minmax` 260→300px. Wires `/`, `N`, `?` shortcuts. |
| `src/app/room/[roomId]/join/page.tsx` | Adds top-left "Back to dashboard" link |
| `src/components/board/Card.tsx` | Footer wrapper gets `card-footer` className so compact density CSS can target it |
| `src/components/board/Section.tsx` | Adds fullscreen button in header, manages local `fullscreen` state, conditionally renders `SectionFullscreen` |
| `src/components/room/RoomBoard.tsx` | 2-column shell: main board (left) + sticky sidebar (right) with tabs for Action items / Sprint metrics. Pending count + submission count badges on tabs. Wires `n`, `a`, `m`, `g h`, `g d`, `?` shortcuts. |
| `src/components/room/RoomHeader.tsx` | New "Past retros" link next to room name, density toggle button, useDensity hook integration |
| `src/lib/db/repositories/room.repo.ts` | `findAll()` SQL extended with 4 section-count subqueries + 3 last-activity subqueries. Reducer in JS picks the latest activity ISO string. |
| `src/lib/types/index.ts` | `RoomSummary` adds `sectionCounts: Record<SectionType, number>` and `lastActivityAt: string` |

### Commit history

- `feat(ui): a11y foundation — focus-visible rings, spacing tokens, keyboard shortcut hook` (56ce957)
- `feat(room): sidebar layout, density toggle, section fullscreen, navigation polish` (20e7c94)
- `feat(dashboard): denser room cards with section preview and last activity` (d97f608)

## 為什麼這樣做 (Why)

### Sidebar layout instead of stacked panels

The original `RoomBoard` stacked `Board → MetricsPanel → ActionItemList` vertically. On 1440p+ screens this wasted ~30% of horizontal space and forced SMs to scroll past the board to manage action items. Sidebar layout keeps everything in one viewport.

The breakpoint chosen is **1100px** rather than 1280px so 1280×800 laptops get the side-by-side layout. Below 1100px the sidebar stacks below — matters for window-snapped split-screen scenarios on desktop, even though we don't target tablets/phones.

### Per-section fullscreen instead of board-wide zoom

A board-wide zoom (showing all 4 sections in fullscreen) doesn't help dedup or focused discussion. Per-section fullscreen does both:

1. Browse before submitting → check if the same idea exists
2. SM walks through each section one by one during discuss

The component is a **portal** so it isn't constrained by Section's `overflow: hidden`. The CardForm is reused so adding cards from inside fullscreen "just works" — Socket.IO broadcasts to all clients regardless of which view they're in.

### Density toggle: CSS-only, no React rerender

Compact mode is implemented via CSS targeting `[data-density="compact"]`. The hook only sets a DOM attribute on `<html>` — no component subscription, no re-render cost. Cards are styled by descendant selector so component code is untouched.

Footer collapse uses `opacity` + `max-height` transitions on `.card-footer` so the layout doesn't jump on hover.

### Shortcuts: chord + skip-on-typing

The `useShortcuts` hook supports multi-key chords (`g h`) by keeping a buffer that resets after 1.5s of inactivity. When the user is typing in an input/textarea, we skip handling (except `Escape`, which still propagates so help overlays close). This prevents `n` from accidentally opening "new retro" while typing in a card composer.

`?` is captured as `e.key === '?'` (browsers map shift+/ to `?` on US keyboards) — not `shift + /`, which would require modifier handling.

### Section + last-activity counts: pure SQL aggregation

Per-section card counts could be computed client-side after fetching cards, but that requires either N+1 round trips or sending cards in the dashboard payload. Using 4 section-count subqueries in the existing `findAll()` query is cheaper and reuses the indexed `cards.room_id, cards.section` columns.

For last activity, three subqueries (`MAX(created_at)` from cards, comments, action_items) plus `closed_at` and `created_at` are reduced in JS via `Math.max`. SQLite's lack of `GREATEST` makes pure-SQL ugly; doing it in JS is cleaner and well-typed.

## 怎麼運作的 (How It Works)

### Component & hook flow

```
┌──────────────────────────────────────────────────────────┐
│                     <html data-theme=…  data-density=…>  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  RoomPage (route) — guards sessionToken            │  │
│  │  ↓                                                 │  │
│  │  SocketProvider                                    │  │
│  │  ↓                                                 │  │
│  │  RoomBoard ── useShortcuts(N/A/M/GH/GD/?)         │  │
│  │      ├── RoomHeader                                │  │
│  │      │     ├─ Past retros link → /?status=closed  │  │
│  │      │     ├─ DensityToggle → useDensity          │  │
│  │      │     └─ ThemeToggle → useTheme              │  │
│  │      ├── main.room-shell (grid 1fr 380px @1100+)  │  │
│  │      │     ├── room-main → <Board/>               │  │
│  │      │     │       └── Sections (4)                │  │
│  │      │     │             └─ fullscreen button     │  │
│  │      │     │             └─ <SectionFullscreen/>  │  │
│  │      │     └── room-aside (sticky top:76)         │  │
│  │      │           ├─ tabs (actions / metrics)      │  │
│  │      │           └─ panel content                  │  │
│  │      └── KeyboardHelp (open on ?)                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### useShortcuts state machine

```
idle (chord = []) ─── keydown matches single binding ──► fire & reset
   │
   └── keydown is prefix of multi-key binding ──► chord = [k1]; arm 1.5s timer
                                                         │
            ◄── chord = [k1, k2] matches ─── keydown ────┤
            │                                            │
        fire & reset                              ── timer fires ──► reset
            ◄── unmatched key ───────────────────────────┘
```

Bindings are looked up via case-insensitive `keys` field. Exact matches win (longest first); partial matches keep the chord buffer alive.

### Section fullscreen lifecycle

1. User clicks the fullscreen button → `Section` sets local `fullscreen = true`
2. `SectionFullscreen` mounts via `createPortal(... document.body)`
3. `useEffect` adds keydown listener for `Escape`, sets `<html style="overflow: hidden">` to lock background scroll
4. On Esc or click "Exit", `onClose` flips state back; portal unmounts; effect cleanup restores body overflow
5. Cards inside are real `<Card />` components — Socket.IO updates flow through `useRoom` → re-render fullscreen and main board simultaneously

### Density application

```ts
// useDensity (excerpt)
useEffect(() => {
  const initial = readStoredDensity();          // localStorage → 'comfortable' | 'compact'
  setDensityState(initial);
  document.documentElement.setAttribute('data-density', initial);
  setHydrated(true);
}, []);
```

CSS picks it up:

```css
[data-density="compact"] .sticky-card { padding: 8px 10px 7px; font-size: 12.5px; }
[data-density="compact"] .sticky-card .card-footer { opacity: 0.4; max-height: 28px; }
[data-density="compact"] .sticky-card:hover .card-footer { opacity: 1; max-height: 200px; }
```

No React tree rerenders when toggled — only the DOM attribute changes and the browser repaints.

### Dashboard SQL

```sql
SELECT
  r.id, r.name, r.status, r.created_at, r.closed_at,
  (SELECT COUNT(*) FROM participants WHERE room_id = r.id) as participant_count,
  (SELECT COUNT(*) FROM cards         WHERE room_id = r.id) as card_count,
  (SELECT COUNT(*) FROM action_items  WHERE room_id = r.id) as action_item_count,
  (SELECT COUNT(*) FROM cards WHERE room_id = r.id AND section='went-well')   as count_went_well,
  ...same for to-improve / thanks / deep-dive...
  (SELECT MAX(created_at) FROM cards        WHERE room_id = r.id) as last_card_at,
  (SELECT MAX(created_at) FROM comments     WHERE room_id = r.id) as last_comment_at,
  (SELECT MAX(created_at) FROM action_items WHERE room_id = r.id) as last_action_at
FROM rooms r ORDER BY r.created_at DESC
```

Reducer in JS: `[last_card_at, last_comment_at, last_action_at, closed_at, created_at].filter(nonNull).reduce(max)` — falls back to `created_at` for empty rooms.

## 怎麼使用 (Usage)

### Add a new shortcut

```tsx
import { useShortcuts } from '@/lib/hooks/useShortcuts';

useShortcuts([
  {
    keys: 'g s',                  // single keys, single chars, or "k1 k2" chords
    description: 'Go to settings',
    handler: () => router.push('/settings'),
  },
]);
```

To surface it in the help overlay, also add to the `SHORTCUTS` array passed to `<KeyboardHelp items={...} />`.

### Read density inside a component

```tsx
import { useDensity } from '@/lib/hooks/useDensity';
const { density, toggle } = useDensity();
return <div>Now: {density}</div>;
```

But you usually don't need to — let CSS target `[data-density="compact"]` directly.

### Open section fullscreen programmatically

The state is local to each `Section`. If you ever need to open it from outside (e.g. an "expand all" button on a per-section basis), lift `fullscreen` to a parent or expose an imperative handle. For now, only the in-header button triggers it.

## 注意事項 (Caveats)

- **`useSearchParams` requires Suspense** in Next.js 16+ for static rendering. The dashboard is a client component, so it works at runtime, but if we ever pre-render `/` we'll need to wrap the content in `<Suspense>`. Build-time warnings would show up first if this becomes an issue.
- **Section fullscreen z-index = 70** — sits above sticky room header (20) and reaction picker (60), below modals (80) and toasts (100). If we add another overlay class, mind the layered ordering documented in `globals.css`.
- **Compact density hides the footer until hover** — touch devices can't hover. Mobile is out of scope, but if a stylus-only Surface user shows up they'll need to tap+hold or stay in cozy mode. Acceptable trade-off for now.
- **Past retros link → `/?status=closed`** — Dashboard's URL → state sync is one-way (initial render only). Switching the filter via the UI doesn't update the URL. Adding a router.replace on filter change would close that loop, but URL noise on the dashboard isn't worth it for now.
- **Section count subqueries in `findAll()`** — Adds 7 subqueries per row. SQLite handles this fine for hundreds of rooms. If/when we have thousands, switch to a single `LEFT JOIN cards GROUP BY` aggregate or denormalize counts on the rooms row.
- **Anonymous invariants preserved** — All new features avoid disclosing per-participant behavior. Tabs/badges show team aggregates only. Voting heatmap (Wave 2.2) will keep this discipline (`votes / onlineCount`, never per-voter).

## 驗證 (Verification)

- Build: `next build` — clean (verified via dev server with no compile errors during 9 incremental edits)
- Dashboard: 141 rooms render with 4 section badges + 3 stats each (DOM eval confirmed)
- Sidebar: tabs switch action items ↔ metrics, aria-selected flips, content visibility flips
- Density toggle: clicking switches `<html data-density>` and persists to localStorage
- Section fullscreen: portal renders, cards in 4-column grid, Esc closes
- Keyboard `?`: dialog opens with grouped shortcut list, Esc closes
- Keyboard chord `g h`: triggers navigation to `/?status=closed` after second key

## Related

- Plan: `~/.claude/plans/ui-ux-retro-purring-feather.md`
- Changelog: `docs/changelog/2026-05-01-wave1-desktop-polish.md`
- Usage: `docs/usage/wave1-desktop-polish.md`
- Aurora design system: `docs/technical/aurora-design-system.md` (unchanged but tokens added by this wave should land in next revision)
