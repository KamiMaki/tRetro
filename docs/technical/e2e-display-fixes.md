# Technical — E2E display fixes (2026-05-02)

## What changed

| File | Change | Why |
|---|---|---|
| `src/app/globals.css` | Replaced `transform: rotate(360deg)` on `.btn-primary::before` with an animated `@property --btn-frame-angle`. Conic gradient reads `from var(--btn-frame-angle)`. | Rotating a wider-than-tall rectangle swept its corners outside the button's static bounds, painting a leaking cyan/violet smudge next to `+ New retro` and `Send`. |
| `src/__tests__/e2e/retro-board.spec.ts` | Updated 6 specs + the `createAndJoinRoom` helper. | Recent UX changes (direct-to-board create, custom-name reveal flow, metrics `distribution`) had drifted past the original assertions. |

No production behavior changed apart from the rendering of the rotating frame.
The gradient still spins; only the *thing being rotated* moved from the
element to the gradient angle.

## Why this approach (CSS animated `@property`)

Three options were on the table:

1. **`overflow: hidden` on the button.** Clips the leak, but also clips the
   intended 2px halo outside the button (the design wants the frame to read
   as a thin outline, not a fully contained background).
2. **Make the `::before` a circle (`inset: -50%`, `border-radius: 50%`).** The
   rotation no longer pokes corners outside, but the gradient no longer hugs
   the rounded-rectangle silhouette either — visible at the corners as the
   frame shape goes round.
3. **Animate the gradient angle, not the element.** Pseudo-element silhouette
   stays static, gradient still rotates, halo intent preserved.

Option 3 was picked because it keeps the design intact with the smallest
diff. The trade-off is browser support: `@property` lands in Chrome 85+ /
Edge 85+ / Safari 16.4+ / Firefox 128+. We added a `@supports not (...)`
fallback that drops the animation but preserves the static frame, so the
button still reads correctly in older Firefox.

## How it works (white-box)

```css
@property --btn-frame-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.btn-primary::before {
  /* …existing inset / blur / z-index… */
  background: conic-gradient(
    from var(--btn-frame-angle),
    /* same five color stops */
  );
  animation: btn-frame-spin 6s linear infinite;
}

@keyframes btn-frame-spin {
  to { --btn-frame-angle: 360deg; }
}
```

`@property` is the missing ingredient: without it the browser treats the
custom property as a string, can't interpolate it, and the keyframe jumps
straight to 360deg instead of animating through the values.

`inherits: false` is important — the angle lives on the `::before` only;
inheriting it onto unrelated descendants could affect other conic gradients.

## Module relationships

```
Dashboard (page.tsx) ──┐
RoomHeader.tsx ────────┼─►  .btn-primary (CSS in globals.css)
CardForm.tsx ──────────┤        ├─ ::before (rotating gradient frame)
JoinPage (join/page.tsx) ┘      └─ ::after (inner mask, hides frame inside)

@property --btn-frame-angle      <- registered in globals.css
@keyframes btn-frame-spin        <- animates the property
@supports not (...)              <- fallback for browsers w/o @property
```

## Caveats

- The rotation is intentionally *not* paused on hover — the design wants the
  frame moving even at rest.
- `:disabled` still kills the animation (`animation: none`), so disabled
  primary buttons display a static gradient.
- Browsers without `@property` see the static `from 0deg` gradient. That's
  acceptable: the button still reads as primary, only the spin is gone.

## Test coverage

- `npx playwright test` — 16/16 passing in 44.6s.
- The visual fix isn't asserted by an automated test (no pixel-diff in this
  suite); it's verified manually via preview screenshot in both themes.
