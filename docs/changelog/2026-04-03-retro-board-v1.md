# Changelog: tRetro v1.0 - Anonymous Real-time Retro Board

**Date**: 2026-04-03
**Type**: New Feature (Greenfield)

## What Changed

### New Files (62 files)
- `server.ts` — Custom HTTP server integrating Next.js + Socket.IO
- `src/lib/types/index.ts` — Shared TypeScript types (CardDB, CardDTO, Room, Participant, etc.)
- `src/lib/db/` — SQLite database layer (connection, schema, migrations, 5 repositories)
- `src/lib/socket/` — Socket.IO server (events, middleware, dto, 4 handlers)
- `src/lib/hooks/` — React hooks (useSocket, useRoom)
- `src/lib/utils/` — Utilities (id generator, export, constants)
- `src/lib/context/SocketContext.tsx` — Socket.IO React context provider
- `src/app/api/` — API routes (rooms CRUD, participants, export, health)
- `src/app/room/` — Room pages (join, board)
- `src/components/` — UI components (board, room, action-items, ui)
- `src/__tests__/` — 8 test suites, 92 tests

### Dependencies Added
- `socket.io` + `socket.io-client` — Real-time communication
- `better-sqlite3` — SQLite database
- `nanoid@3` — ID generation
- `tsx` — TypeScript execution for custom server
