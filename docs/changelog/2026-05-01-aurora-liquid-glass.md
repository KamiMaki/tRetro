# Aurora Liquid Glass — 2026-05-01

## Summary

Replaces the previous Tailwind indigo theme with a dark-first **Aurora liquid-glass** design system. Every screen and atom is migrated. The old generic "indigo + white card" look is gone; the app now reads as a polished, modern retrospective tool with glassmorphism, animated aurora background, and tone-coded sections.

## What changed

### Added
- `src/components/ui/Aurora.tsx` — shared atoms: `AuroraBg`, `GlassPanel`, `Logo`, `Avatar`, `IconBtn`, `Toggle`, `Chip`, `tagTone()`.
- Aurora design tokens in `src/app/globals.css` — `--aurora-mint/cyan/violet/pink/amber`, `--glass-bg/border/highlight/shadow`, `--bg-0..2`, `--fg-0..3`, font families.
- Global CSS classes: `.glass`, `.glass-strong`, `.aurora-bg`, `.aurora-text`, `.sticky-card[data-tone]`, `.col[data-col]`, `.live-dot`, `.drop-in`, `.fade-in`, `.btn / .btn-primary / .btn-ghost / .btn-danger`, `.chip[data-tone]`, `.field`, `.toggle`.

### Changed
- `src/app/layout.tsx` — drops Geist font, uses `data-theme="dark"`, removes Tailwind dark-mode classes from `<body>`.
- `src/app/globals.css` — replaced almost entirely; keeps Tailwind base + adds the Aurora system above it.
- `src/app/page.tsx` (dashboard) — new hero, glass search, mono filter pills, Aurora-tinted board cards with hue glow, "New retro" modal redesigned.
- `src/app/room/[roomId]/join/page.tsx` — single glass card with gradient title + gradient submit button.
- `src/app/room/[roomId]/page.tsx` — loading state uses Logo + live dot.
- `src/app/room/[roomId]/history/page.tsx` — fully restyled, read-only board with section accents, stats grid, action-items list.
- `src/components/board/Board.tsx` — drops Tailwind `grid-cols-*` for a `.board-grid` styled-jsx block.
- `src/components/board/Section.tsx` — uses `.col[data-col]` accent system + `GlassPanel`.
- `src/components/board/Card.tsx` — sticky-card visual; reaction/comment/vote/draw/reveal/delete buttons restyled inline.
- `src/components/board/CardForm.tsx` — `.field` textarea, mono "tags · n" pill, gradient Send button with `⌘↵` hint.
- `src/components/board/{TagBadge,TagFilter,SortControls,VoteButton,ReactionBar,CommentList,DrawingThumbnail,DrawingModal}.tsx` — all migrated to glass + chip + mono labels.
- `src/components/room/{RoomHeader,RoomBoard,ParticipantList}.tsx` — sticky glass header with avatar stack, Aurora background under board, glass participant card.
- `src/components/action-items/{ActionItemList,ActionItemCard,ActionItemForm}.tsx` — glass list with mint icon, glass cards, dashed pill "Add action item" affordance.
- `src/components/ui/Toast.tsx` — glass + tone-colored bottom-right toast with success/error/info variants.

### Removed
- Tailwind utility-first dark-mode markup (`bg-white dark:bg-gray-900` etc.) on layout/page chrome — replaced by CSS-variable driven `.glass` surfaces. Tailwind itself stays for spacing/layout in some legacy spots inside form components but no longer drives chrome theming.

## How to use

- Default theme is dark (`<html data-theme="dark">` in `layout.tsx`). To switch a subtree to light mode for testing, override `data-theme="light"` on any wrapper.
- Tag colors auto-tint via `TagBadge` reading the stored hex; the new tag color palette in `CardForm.tsx` aligns with the Aurora hues.
- Reuse `GlassPanel`, `AuroraBg`, `Avatar`, `Logo`, `IconBtn`, `Chip`, `Toggle` from `@/components/ui/Aurora` instead of redoing styles inline.

## Verification
- `npx tsc --noEmit` — passes
- `npm run lint` — 3 pre-existing errors (unchanged from before this commit), 0 new errors introduced
- `npm run build` — succeeds; all 6 routes compile
- Visual verification at 1440×900: Home, Join, Board, History, "New retro" modal — all render correctly on dark Aurora background.

## Source

Design extracted from Claude Design handoff bundle:
`https://api.anthropic.com/v1/design/h/xN-JHOVeYomtL-1HYMAKqg?open_file=tRetro.html`
