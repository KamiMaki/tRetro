# Aurora Liquid Glass — usage guide

This is the visual language for tRetro. It's "彩科技 + 液態玻璃" — futuristic gradient palette painted on translucent frosted-glass surfaces, on a dark backdrop with animated aurora glows.

## At a glance

- **Default mode:** dark. Light mode is implemented via `[data-theme="light"]` overrides — switch the attribute on `<html>` to flip.
- **Palette:** mint / cyan / violet / pink / amber, expressed in `oklch()` so the same hue values look right in both modes.
- **Surfaces:** every "card" or "panel" you see is a `<GlassPanel>` — a backdrop-filter blur + saturated tint with a thin top highlight.
- **Background:** every full-screen route mounts `<AuroraBg />` once. It's a fixed layer behind everything that animates three blurred radial blobs.

## How to read the dashboard

```
┌──────────────────────────────────────────┐
│ T  tRetro   [Search…  ⌘K]   🔔  (A)     │  ← top bar
├──────────────────────────────────────────┤
│ • 42 retros · 6 active sessions          │  ← live status pill
│ Welcome back to tRetro                   │  ← gradient title
│ Aurora liquid-glass retros — anonymous…  │
│                                          │
│ [+ New retro]  [Recent | A→Z]  all/active/closed
│                                          │
│ ACTIVE ─────────────────────────────     │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ live │ │ live │ │ live │ │ live │     │  ← glass cards w/ hue glow
│ │ name │ │ name │ │ name │ │ name │     │
│ │ 🧑3 📋8 ✓2 │ etc.                     │
│ └──────┘ └──────┘ ...                    │
└──────────────────────────────────────────┘
```

- The little **mint dot** that pulses next to "42 retros" is the live indicator. It shows up everywhere the system is connected.
- Each retro card has a corner glow whose hue is derived from the room id, so cards never look identical.
- The status pill (`live` / `closed`) on each card uses the same mint/grey tones as the rest of the system.

## How to read a retro board

```
┌────────────────────────────────────────────────┐
│ T  Sprint 42 Retro                  (A)(J)(M) │
│    • Live · 3 present                          │
├──────────┬──────────┬──────────┬──────────────┤
│ ✓ Went   │ ! To     │ ★ Thanks │ ? Deep Dive  │
│   Well   │   Improve│          │              │
│   2 cards│   1 card │  3 cards │   1 card     │
├──────────┼──────────┼──────────┼──────────────┤
│ [ mint  ]│ [ pink  ]│ [ amber ]│ [ violet  ]  │  ← sticky cards
│ [ card  ]│ [ card  ]│ [ card  ]│ [   card  ]  │
│          │          │          │              │
├──────────┼──────────┼──────────┼──────────────┤
│ Drop a…  │ Drop a…  │ Drop a…  │ Drop a…      │  ← composer
│ [tags]   │ [tags]   │ [tags]   │ [tags]       │
│  Send⌘↵ │  Send⌘↵ │  Send⌘↵ │  Send⌘↵     │
└──────────┴──────────┴──────────┴──────────────┘
```

Each section has its own accent colour:

| Section | Accent | Sticky tone |
|---|---|---|
| Went Well | mint | mint linear glass |
| To Improve | pink | pink linear glass |
| Thanks | amber | amber linear glass |
| Deep Dive | violet | violet linear glass |

The icon in the column header (`✓ ! ★ ?`) and the sticky-card tint reinforce the same colour, so even at a glance you know which column you're looking at.

## Cards in detail

A sticky card holds:

- the message body
- coloured tags (each tag chip uses the tag's stored hex, softened for glass background)
- emoji reactions (click `+` to open the picker)
- attached drawings (thumbnails open in a glass lightbox)
- a footer row: avatar + author label, vote button, comment count, draw, reveal (own anon cards), delete (own/SM)

If a card is yours and still anonymous, the author label says **You** in violet. Other anonymous cards say **anonymous** in dim grey with a "ghost" avatar.

## Composer

Click any column footer "Drop a thought…" to expand the composer:

- **Press ⌘↵ (Mac) / Ctrl↵ (Win)** to send.
- **`tags` pill** opens an inline panel where you can pick existing tags or add new ones.
- The "Send" button is the violet→mint gradient — that gradient is reserved for the primary action on every screen.

## Action items

Below the board, the **Action items** glass panel lists pending and completed action items.

- Scrum masters get a checkbox + a "+ Add action item" dashed pill.
- Non-SMs see a read-only checkbox.
- Overdue items get a red pill on the date.

## History view

When a room is closed, its dashboard card switches to **closed**. Clicking it opens `/room/[id]/history` — a read-only mirror of the board with a stats bar (participants, cards, action items, tags, created date) and Markdown / HTML export buttons in the header.

## Theme tips

- The aurora background is always behind everything but never blocks pointer events (it's `pointer-events: none`).
- All `<GlassPanel>` instances respect dark/light through CSS variables — no per-component theming.
- All buttons are exactly one of: `.btn` (default glass), `.btn-primary` (violet→mint gradient), `.btn-ghost` (transparent), `.btn-danger` (red glass). Pick the right one.
- Use `.aurora-text` to gradient-fill any inline text (used on the dashboard hero "tRetro" word).

## Keyboard

| Combo | What it does |
|---|---|
| ⌘↵ / Ctrl↵ | Send card from composer |
| Enter (in comment box) | Post comment |
| Shift+Enter (in comment box) | Newline without posting |
| Esc | Close any modal (click backdrop) |

## Browser support

Glassmorphism relies on `backdrop-filter`. Tested in modern Chromium, Firefox 121+, Safari 17+. On older browsers the panels degrade to a flat semi-transparent colour, which still reads cleanly on the dark Aurora background.
