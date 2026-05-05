# 2026-05-02 — E2E display fixes

## Summary

A visual sweep driven by the Playwright e2e suite turned up one real display
defect (the `+ New retro` / `Send` primary buttons leaking a teal/cyan smudge
outside their rounded-rect bounds, especially in light mode) and four cases of
test-side rot where the suite was checking against an older UX flow. Fixed the
CSS defect and brought the test suite back to 16/16 green.

## What changed

### CSS — `src/app/globals.css`

The animated gradient frame around `.btn-primary` was rotating the *element*
(`transform: rotate(360deg)` on the `::before` pseudo). Because the button is
wider than tall, rotating its rounded rectangle causes the corners to sweep an
area larger than the button's static bounds, which painted a moving cyan/violet
blob next to the button.

The gradient now spins via an animated `@property --btn-frame-angle`
(angle-typed custom property), and the conic gradient reads
`from var(--btn-frame-angle)`. The pseudo-element itself never moves, so its
silhouette stays exactly inside the button's rounded rectangle.

A `@supports not (...)` fallback drops the animation in browsers without
`@property` support (Firefox <128) but keeps the static gradient frame
readable.

### E2E suite — `src/__tests__/e2e/retro-board.spec.ts`

- `createAndJoinRoom` helper navigates to `/room/{id}/join` explicitly. The
  `joinUrl` returned by `POST /api/rooms` is now the direct board URL (the
  board auto-joins as a guest), so the old helper timed out waiting for the
  `e.g. Aria` placeholder.
- `should create a new retro room from dashboard` accepts either
  `/room/{id}` or `/room/{id}/join` in the post-create URL match.
- `should reveal card author identity` clicks the chip-style `reveal`
  button, then clicks the inline form's submit `reveal` to actually publish
  the identity (the reveal flow now has a custom-name picker step).
- `metrics aggregate API never leaks identity fields` expects the new
  `distribution` histogram (length 10) in the API response keys.
- Sprint Metrics test scopes its panel-text assertions to
  `#main-panel-metrics` (the panel header and the tab label both contain
  "Sprint metrics", which broke strict-mode `getByText`). The post-submit
  tally check reads the header sentence "1 submission" rather than the
  aggregate row, since the row's sub-meta switches to `you · X` once you've
  submitted.

## Why

The button-frame leak was the only user-visible bug, and it was an animation
bounding-box problem rather than a styling regression — easy to overlook
because the static gradient looked fine, the leak only showed during rotation.
Switching to an animated angle is the textbook fix and keeps the same
visual language. The test fixes were follow-up housekeeping after recent
behavior changes (direct-to-board create flow, custom-name reveal, metrics
distribution histogram).

## Verification

- `npx playwright test`: **16 passed (44.6s)**, exit code 0.
- Manual preview check in both themes (1280×800 and 782×884 viewports):
  the rotating frame stays clipped to the primary button's silhouette in
  light and dark.

## Files touched

- `src/app/globals.css`
- `src/__tests__/e2e/retro-board.spec.ts`
- `.omc/prd.json`
- `.omc/progress.txt`
