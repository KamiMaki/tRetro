# 2026-06-13 — Team customization, onboarding & UX fixes

A batch that makes boards customizable per team, teaches first-time users,
and polishes the commenting/discussion experience.

## ✨ New — Customization

- **Custom board sections.** Sections are no longer the four fixed columns.
  Each room has its own editable sections — rename, recolor (5 tones),
  change emoji, **add, remove, and reorder**. Edits broadcast live to
  everyone in the room. Open with the **Sections** button on the board.
- **Per-team default layout.** A team can define its default board sections
  in **Team settings** (gear next to the team name on the dashboard). New
  rooms start from the team's layout (falling back to the chosen template).
  Editing a team default never rewrites existing/closed retros.
- **Per-team summary prompt.** Each team can customize the AI summary prompt
  used by the **Summary Prompt** export (`?format=ai`). Unset → built-in
  default.
- **Per-team reaction emoji palette.** Teams can curate the emoji shown in
  the card reaction picker.

## 📚 New — Onboarding

- **First-run guide.** A 6-step coach-mark tour auto-shows the first time a
  user opens a board, highlighting the tabs, timer, section customization,
  the Guide drawer, and the Summary Prompt/export. Skippable; replay any
  time with the **教學** button.

## 🛠 Fixes / polish

- **Editable comments.** Authors (and SMs) can now edit a comment's text and
  image inline; edited comments show an 「已編輯」 marker.
- **Friendlier oversize-image hint.** Oversized images are rejected *before*
  encoding, with the actual size in the message (e.g. `圖片 4.2MB 超過上限 2MB`).
- **Click-to-zoom.** Comment images open in a full-screen lightbox (card
  images already did).
- **Resizable discussion comments.** The right comment column in Discussion
  mode is now draggable (260–640px) and remembers its width.

## 🗄 Data / migration

- `cards.section` lost its 4-value CHECK constraint (table rebuilt,
  FK-safe, zero data loss); `room_sections` / `team_sections` tables added
  and backfilled for existing rooms; `teams.summary_prompt`,
  `teams.reaction_emojis`, `comments.updated_at` columns added. All
  migrations are idempotent and run on startup.

## ✅ Verification

- jest unit/integration: full suite green (282 tests).
- `next build`: clean.
- Playwright e2e (real browser, daily-password gate): full suite green.

See `docs/usage/team-customization.md` (how to use) and
`docs/technical/team-customization.md` (how it works).
