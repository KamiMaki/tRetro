# Changelog: tRetro v2.0 - Dashboard + V2 Features + E2E Tests

**Date**: 2026-04-03
**Type**: Feature Enhancement

## What Changed

### Dashboard (New)
- Homepage redesigned as retro management dashboard
- Room listing with stats (participants, cards, action items)
- "New Retro" button opens create modal → navigates to join page
- Active rooms show "Join" button, closed rooms show "View History"

### V2 Card Features (New)
- **Comments**: Real-time comment threads on any card
- **Emoji Reactions**: Toggle reactions (10 common emojis), per-user state
- **Voting**: Upvote cards with count display, per-user tracking
- **Drawing**: Canvas-based sketching (8 colors, 3 brush sizes, eraser)

### History View (New)
- Read-only view of closed retro boards at `/room/{id}/history`
- Shows all cards, comments, reactions, votes, drawings
- Export buttons (MD/HTML)

### API Additions
- `GET /api/rooms` — List all rooms with aggregate stats
- `GET /api/rooms/{id}/history` — Full room data for read-only display

### Bug Fix
- `useRoom` hook now emits `room:join` on socket connect (was missing)

### Testing
- Playwright E2E tests: 11 tests covering full user flow
- All 92 unit tests still passing

### Files Added/Modified: 35 files
- 4 new DB tables: comments, reactions, votes, drawings
- 4 new repositories + 4 new socket handlers
- 5 new UI components: CommentList, ReactionBar, VoteButton, DrawingModal, DrawingThumbnail
- Dashboard page, History page, History API route
- Updated: Card, Board, Section, RoomBoard, useRoom, dto, events, types
