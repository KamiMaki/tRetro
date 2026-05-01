# Aurora Liquid Glass — technical document

This document explains the design-system migration that landed in commit
`feat(ui): apply Aurora liquid-glass design system` (2026-05-01). It is
written for an engineer who needs to extend, theme, or modify the UI of
tRetro without breaking the Aurora visual language.

## What changed

### Files added
- `src/components/ui/Aurora.tsx` — shared atoms used everywhere

### Files modified (chrome/theme)
- `src/app/globals.css` — replaced almost entirely
- `src/app/layout.tsx` — set `data-theme="dark"`, removed Geist + Tailwind dark classes
- `src/app/page.tsx` — dashboard
- `src/app/room/[roomId]/join/page.tsx` — join screen
- `src/app/room/[roomId]/page.tsx` — room loading
- `src/app/room/[roomId]/history/page.tsx` — history view

### Files modified (components)
- `src/components/board/{Board,Section,Card,CardForm,TagBadge,TagFilter,SortControls,VoteButton,ReactionBar,CommentList,DrawingThumbnail,DrawingModal}.tsx`
- `src/components/room/{RoomBoard,RoomHeader,ParticipantList}.tsx`
- `src/components/action-items/{ActionItemList,ActionItemCard,ActionItemForm}.tsx`
- `src/components/ui/Toast.tsx`

### Files NOT touched
- All server code (`src/lib/db/**`, `src/lib/socket/**`, `src/lib/hooks/**`, route handlers under `src/app/api/**`).
- Shared types in `src/lib/types/index.ts`.
- Tests under `src/__tests__/**`.

## Why we did it this way

### 1. CSS variables, not Tailwind classes, drive the chrome

The previous design used `bg-white dark:bg-gray-900 border-gray-200 …`
on every "card" element. Switching themes meant maintaining matched
pairs of colour utilities everywhere.

Aurora flips this: every visual token is a CSS custom property declared
on `:root` in dark mode and overridden under `[data-theme="light"]`.
Components consume `var(--glass-bg)`, `var(--fg-0)`, `var(--aurora-violet)`
etc. To switch theme we change one attribute on `<html>`. Components
contain zero theming logic.

Tailwind still loads (`@import "tailwindcss"`) so layout/spacing
utilities (`flex`, `gap-*`, `grid`) keep working — we just don't use
its colour palette anymore.

### 2. One reusable glass primitive

Every card-like surface uses `<GlassPanel>`. Internally it applies the
`.glass` class which combines:

- a low-alpha tinted background (`var(--glass-bg)`)
- backdrop blur + saturate (the "frosted" effect)
- a 1-pixel translucent border
- a layered drop shadow + 1px inset highlight on top
- a `::before` linear-gradient sheen for the glassy reflection

`<GlassPanel strong>` swaps in `var(--glass-bg-strong)` for the few
places that need more opacity (modals, the create-room dialog, the
sticky-card body).

### 3. Tone-coded retro columns

The four retro columns were colour-tagged with arbitrary Tailwind
classes before. Aurora gives each column an accent variable through
the `[data-col]` attribute:

```css
.col[data-col="went-well"]  { --col-accent: var(--aurora-mint); }
.col[data-col="to-improve"] { --col-accent: var(--aurora-pink); }
.col[data-col="thanks"]     { --col-accent: var(--aurora-amber); }
.col[data-col="deep-dive"]  { --col-accent: var(--aurora-violet); }
```

`Section.tsx` writes `data-col={section}` on its outer `<div>` and the
column header icon then reads `var(--col-accent)`. `Card.tsx` receives
a `tone` prop derived from the column key and renders
`<div class="sticky-card" data-tone={tone}>`. The CSS does the rest:

```css
.sticky-card[data-tone="mint"] {
  background: linear-gradient(160deg, oklch(0.82 0.16 175 / 0.30), oklch(0.65 0.14 175 / 0.18));
  border-color: oklch(0.82 0.16 175 / 0.35);
}
```

Adding a new column tone is two lines of CSS plus an entry in
`SECTION_META` inside `Section.tsx`.

### 4. Aurora background as a fixed isolate

`<AuroraBg />` renders a `position: fixed` `inset: 0` `z-index: 0`
container with three radial-gradient blobs (`::before`, `::after`,
`.blob-3`). Each blob is heavily blurred (`filter: blur(90px)`),
mix-blends `screen` over the dark background, and animates via the
`aurora-drift` keyframes (24-30s ease in/out, opposite directions).

Every page that uses it puts the rest of its content inside a
`position: relative; z-index: 1` div and an outer
`isolation: isolate; position: relative` so the fixed background doesn't
bleed past the page's stacking context.

In light mode the same blobs switch from `mix-blend-mode: screen` to
`multiply`, so the colours subtract instead of add and you get pastel
washes on a near-white background.

## How it works (mental model)

```
┌─────────────────────────── <html data-theme="dark"> ─┐
│                                                       │
│  CSS variables resolve dark values:                   │
│   --bg-0 = oklch(0.13 …)                              │
│   --glass-bg = oklch(0.25 0.04 270 / 0.42)            │
│   --aurora-violet = oklch(0.68 0.20 285)              │
│                                                       │
│  ┌───────────── <body> (dark bg, fg-0 text) ───────┐ │
│  │  ┌───── <main isolation: isolate> ───────────┐  │ │
│  │  │  ┌─ <AuroraBg> (fixed, z-0) ──────────┐   │  │ │
│  │  │  │   ::before  ::after  .blob-3       │   │  │ │
│  │  │  │   (3 animated blurred blobs)       │   │  │ │
│  │  │  └────────────────────────────────────┘   │  │ │
│  │  │  ┌─ Page content (relative, z-1) ─────┐   │  │ │
│  │  │  │  <header sticky glass>             │   │  │ │
│  │  │  │  <GlassPanel> … </GlassPanel>      │   │  │ │
│  │  │  │  <Section data-col=…>              │   │  │ │
│  │  │  │    <Card tone=…>                   │   │  │ │
│  │  │  │  </Section>                        │   │  │ │
│  │  │  └────────────────────────────────────┘   │  │ │
│  │  └────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Switching `data-theme="light"` on `<html>` changes the variable values.
Every consumer re-paints automatically — no React re-render, no class
swap.

## Module relationships

```
src/components/ui/Aurora.tsx
  ├── AuroraBg         (fixed background blobs)
  ├── GlassPanel       (frosted card surface)
  ├── Logo             (gradient wordmark)
  ├── Avatar           (gradient initials, anon variant)
  ├── IconBtn          (square icon button)
  ├── Toggle           (anon toggle / option toggle)
  ├── Chip             (pill chip with tone)
  └── tagTone()        (string → tone bucket)

Consumed by:
  ├── src/app/page.tsx                            ← dashboard
  ├── src/app/room/[roomId]/page.tsx              ← loading
  ├── src/app/room/[roomId]/join/page.tsx
  ├── src/app/room/[roomId]/history/page.tsx
  ├── src/components/room/{RoomBoard,RoomHeader,ParticipantList}.tsx
  ├── src/components/board/{Section,Card,DrawingModal,DrawingThumbnail,
  │                          TagFilter,SortControls,CommentList}.tsx
  ├── src/components/action-items/{ActionItemList}.tsx
  └── src/components/ui/Toast.tsx
```

## Code patterns

### Mounting a page with the Aurora background

```tsx
import { AuroraBg } from '@/components/ui/Aurora';

export default function MyPage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <AuroraBg />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* page content */}
      </div>
    </main>
  );
}
```

### Using a glass panel

```tsx
import { GlassPanel } from '@/components/ui/Aurora';

<GlassPanel style={{ padding: 18, borderRadius: 12 }}>
  …
</GlassPanel>

// for modals / dialogs that should sit above the rest
<GlassPanel strong style={{ padding: 28 }}>
  …
</GlassPanel>
```

### Adding a new accent tone

1. In `globals.css` add a new aurora variable if needed:
   ```css
   --aurora-coral: oklch(0.78 0.18 30);
   ```
2. Add a `.chip[data-tone="coral"]` rule.
3. Add a `.sticky-card[data-tone="coral"]` rule.
4. Use it: `<Chip tone="coral" label="…" />` or
   `<div className="sticky-card" data-tone="coral">…</div>`.

### Buttons

There are exactly four variants:

```tsx
<button className="btn">…</button>           // default glass
<button className="btn btn-primary">…</button>  // violet→mint gradient
<button className="btn btn-ghost">…</button>    // transparent
<button className="btn btn-danger">…</button>   // red glass
```

All four are defined in `globals.css`. Don't reinvent button styles.

### Form fields

```tsx
<input className="field" />
<textarea className="field" />
```

`.field` produces a glass-tinted input with the violet focus ring used
across the app.

## Caveats

- **`@import` order in `globals.css`** — the Google fonts `@import url(…)` MUST come BEFORE `@import "tailwindcss"`. Tailwind v4 expands its import inline before any `@import` is stripped, so any `@import` after it ends up after a rule and PostCSS rejects the stylesheet. This was the cause of the build failures during initial migration.
- **`backdrop-filter` performance** — every `GlassPanel` triggers a backdrop blur. On a packed dashboard with 30+ glass cards, scrolling can drop frames on low-end GPUs. If we ever ship to mobile we should add an `@media (prefers-reduced-transparency: reduce)` fallback that drops the blur for a flat tint.
- **`oklch()` values** — colours use `oklch()` for perceptual uniformity. All modern browsers support this, but if you ever need to hand-edit a hex value, use a converter so the new value lands in the right perceptual bucket.
- **Tag chip colours** — `TagBadge` reads the user-defined hex stored on the tag, then softens it to a glass chip via inline RGBA conversion in `TagBadge.tsx`. New tags get a colour from a curated 5-hue palette inside `CardForm.tsx` that aligns with the Aurora system. Older tags created before this commit may have hex values outside the palette; they still render correctly but won't perfectly match the rest of the UI.
- **Drawing canvas** — `DrawingModal` paints on a `#ffffff` canvas because the saved PNG needs to be readable on any background (e.g. exported HTML/MD). The canvas itself stays pure white inside its glass surround on purpose.
- **`<input type="date">`** — set `colorScheme: 'dark'` inline so the native date picker matches the dark theme. Native date pickers can't be styled further with CSS.

## Testing & validation

After this change:

```bash
npx tsc --noEmit       # passes
npm run lint           # 3 errors — all pre-existing, none from this commit
npm run build          # builds 6 routes successfully
```

Visual verification was done in browser at 1440×900 against:
- `/` (dashboard with mock rooms)
- `/room/[id]/join`
- `/room/[id]` (board with 4 columns)
- `/room/[id]/history`
- "New retro" modal

Screenshots from those runs are not committed — they were used for
agent-driven verification only.

## Future work

- **Light theme** is wired but not exposed in UI. Add a theme toggle in the dashboard header that flips `data-theme` on `<html>` (persisted in `localStorage`).
- **Tweaks panel** from the design source includes blur intensity / saturation / colour-theme sliders. None of those are exposed yet — we ship the defaults baked into CSS. If we ever build a "settings" UI, the variables `--glass-blur`, `--glass-saturation`, and the `--aurora-*` palette can all be live-overridden via inline CSS on `:root`.
- **Discussion mode + Metrics screen + Markdown export preview** screens exist in the design source but were out of scope for this UI migration. They'd build naturally on the same atoms.
