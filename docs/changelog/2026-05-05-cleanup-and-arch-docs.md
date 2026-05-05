# 2026-05-05 — codebase cleanup + architecture documentation

## Summary

Aggressive cleanup pass to prepare the project for first GitHub publication
on https://github.com/KamiMaki/tRetro. Removed dead files, consolidated
duplicated utilities, fixed stale tests, and added a single-source-of-truth
architecture document.

## What changed

### Removed (dead code)

- `src/lib/utils/constants.ts` — `SECTION_COLORS` and `DEFAULT_TAG_COLORS` had zero importers.
- `src/lib/hooks/useSocket.ts` — superseded by `useRoom`; never imported.
- `src/lib/context/SocketContext.tsx` — `SocketProvider` was wrapped around
  `<RoomBoard>` but the wrapped tree never called `useSocketContext()`. The
  provider was opening a phantom parallel socket connection that did nothing.
- `src/components/room/CreateRoomForm.tsx` — superseded by inline form in `src/app/page.tsx`.
- `src/components/room/ParticipantList.tsx` — participants are rendered inline in `RoomHeader`.
- `src/lib/util/` (singular) directory — consolidated into `src/lib/utils/` (plural).
  `consensus.ts` moved; the old `util` dir is gone.
- Empty test scaffolding dirs `src/__tests__/integration/api/` and `.../socket/`.
- Top-level junk: `tsconfig.tsbuildinfo` (regenerates), `data/tretro.db` (0-byte
  ghost — actual db is `data/retro.db`), `test-results/` (Playwright artifacts).

### Removed (unused exports inside files)

- `Vote` interface, `JoinRoomPayload` interface — `src/lib/types/index.ts`
- `closeDb()` — `src/lib/db/connection.ts`
- `getIO()` and the unused module-level `io` global — `src/lib/socket/server.ts`
- `DEFAULT_TEMPLATE_ID` — `src/lib/templates/index.ts`
- `IconBtn`, `Toggle`, `Chip`, `tagTone`, `hashTone`, `TAG_TONE_MAP` —
  `src/components/ui/Aurora.tsx`. These were leftover scaffolding from earlier
  design iterations.
- `cards` and `actionItems` props on `RoomHeader` — declared but never destructured;
  `RoomBoard` was passing them in dead.
- `_tags: Tag[]` parameter on `buildRetroCsv` — kept "for future use" but always
  ignored. Caller updated.

### Refactored

- `SECTION_TONES` was duplicated in `Section.tsx` and `SectionFullscreen.tsx`.
  Extracted to `src/lib/types/index.ts` (single source of truth).
- `useShortcuts.ts` — `bindingsRef.current = bindings` was being set during
  render. Moved into a `useEffect` (latest-ref pattern) to satisfy the
  React 19 stricter `react-hooks/refs` lint rule.

### Test fixes

- `card.repo.test.ts` — `cardRepo.reveal(card.id)` was missing the required
  nickname argument. Now passes `'TestUser'` and asserts `revealedNickname`.
- `dto.test.ts` — `makeCard` fixture was missing `revealedNickname`; Tag
  fixtures were missing `isDefault`. Fixed.
- `participant.repo.test.ts` — the "second participant is NOT a ScrumMaster"
  assertion was stale: since
  [eb0ea99](https://github.com/KamiMaki/tRetro/commit/eb0ea99), every
  participant is a ScrumMaster by default. Tests now reflect that.
- `export.test.ts` — `Room` and `CardWithMeta` fixtures were missing newly-required
  fields (`webhookUrl`, `templateId`, `revealedNickname`). Tag fixtures were
  missing `isDefault`. Fixed.

### Infrastructure

- `.gitignore` now ignores `test-results/`, `playwright-report/`, `.omc/`,
  and `.claude/settings.local.json` — local agent harness state and CI
  artifacts that don't belong in source control.

### Documentation (new)

- `docs/ARCHITECTURE.md` — plain-language (中英混) walkthrough of the entire
  system: what it does, how the architecture fits together, why each technical
  choice was made, the data flow for a single user action, what each module is
  responsible for, security/privacy invariants, and how to run it.
- `README.md` — replaced the create-next-app boilerplate with a real project
  description, quick-start, stack table, feature list, and pointers into the
  docs.

## Why

This was the first push of the project to a public GitHub repo. Before
publishing it made sense to:

1. Strip out anything that was clearly never used so the codebase is honest.
2. Fix the latent test failures so `npm test` is a useful signal.
3. Bring `next lint` to zero errors so contributors aren't fighting noise.
4. Write *one* document a new contributor can read in 15 minutes to understand
   the whole system, instead of stitching together 12 wave-style change docs.

## Verification

- `npx tsc --noEmit` — passes (was failing on missing-field errors in
  `export.test.ts`).
- `npm test` — passes (previously had a stale assertion failing on
  `participantRepo` and 4 tsc errors blocking compilation).
- `npx eslint . --quiet` — zero errors (previously 11 errors from React 19's
  stricter hook rules).

## How to apply

No runtime impact — purely deletes, refactors, and test fixes. Pull and rebuild;
no migration needed.
