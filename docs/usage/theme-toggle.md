# Theme toggle — usage guide

tRetro now ships with both **dark** (default) and **light** modes. The
toggle lives in the top-right of every page.

## How to switch

Click the pill-shaped button labeled **dark** (with a moon icon) or
**light** (with a sun icon). The whole UI repaints instantly.

Your choice is remembered in `localStorage` and applied on the very
next page load — no flash of the wrong theme even on hard refresh.

## Where it appears

| Page | Position |
|---|---|
| Dashboard `/` | Top bar, between the search and notifications |
| Join `/room/:id/join` | Floating in the top-right corner |
| Room board `/room/:id` | Sticky header, between the avatar stack and Share |
| History `/room/:id/history` | Sticky header, before the Export buttons |

## What changes

- **Background**: dark → near-black (`oklch(0.13 0.03 270)`); light → off-white.
- **Aurora glows**: in dark they brighten with `mix-blend-mode: screen`; in light they tint pastels with `multiply`.
- **Glass surfaces**: opacity is bumped in light mode so they read as solid against white.
- **Sticky cards**: each section colour (mint/pink/amber/violet) gets a custom gradient per theme so it looks coloured-but-readable on either background.
- **Buttons**: the gradient `Send` / `New retro` button switches its text colour from dark (on dark bg) to white (on light bg) for readability.
- **Form fields**: select dropdown arrow is hand-drawn so it matches the glass aesthetic; date picker icon inverts in dark mode so it stays visible.

## Tip

Theme is per-browser-per-device. If you use tRetro on multiple devices,
each one remembers its own preference.

## Resetting

To clear your preference and fall back to the default (dark), open
DevTools → Application → Local Storage → your origin → delete
`tretro-theme`. Reload.

## Other UI fixes shipped alongside

- **Emoji reactions**: the `+` picker no longer overflows narrow columns or the viewport. It floats above the board and flips position automatically when there's no room above the trigger.
- **Drawing modal**: opens cleanly above the rest of the board with a higher stacking layer than card overlays — no more visual collision between the drawing canvas and the card-detail dim layer.
- **Toast notifications**: now readable on both themes (previously the success/error colour bled into a white-on-white look in light mode).
