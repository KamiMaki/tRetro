# tRetro

> Real-time, anonymous Sprint retrospective board with consensus heatmaps,
> sprint metrics, action items, and AI summary export.

[![status](https://img.shields.io/badge/status-active-brightgreen)]() [![next](https://img.shields.io/badge/next.js-16-black)]() [![react](https://img.shields.io/badge/react-19-blue)]() [![socket.io](https://img.shields.io/badge/socket.io-4-010101)]() [![sqlite](https://img.shields.io/badge/storage-sqlite-003b57)]()

---

## What it does

Open a retro room → share the link → everyone drops sticky notes anonymously
into 4 sections (Went Well / Didn't Go Well / Thanks / Deep Dive). Vote, react,
comment, sketch, convert insights into action items, and export a Markdown / HTML /
CSV / AI-ready summary when you're done. Works for distributed teams; no account
needed; one self-hosted Node process.

Built for facilitators who want a clean, distraction-free, **dark-and-light-aware
glassmorphism** UI without giving up real-time collaboration features.

---

## Quick start

```bash
# Install once
npm install

# Run dev (port 3000 — Next.js + Socket.IO on the same HTTP server)
npm run dev

# Run tests
npm test            # Jest (unit + repository + dto)
npm run test:e2e    # Playwright

# Build for production
npm run build
NODE_ENV=production npm start
```

State is a single SQLite file at `data/retro.db` (auto-created on first run).
Wipe it with `rm data/retro.db*` to start over.

### Docker

```bash
# Build (multi-stage, ~150 MB final image)
docker build -t kamimaki/tretro:latest .

# Run (SQLite persisted in a named volume)
docker run -d --name tretro -p 3000:3000 \
  -e DATABASE_PATH=/data/retro.db \
  -v tretro-data:/data \
  kamimaki/tretro:latest

# Logs
docker logs -f tretro

# Stop / cleanup
docker stop tretro && docker rm tretro
```

The image runs `tsx server.ts` directly (no build of the custom server),
exposes port 3000, and includes a `HEALTHCHECK` against `/api/health`.

---

## Architecture in 30 seconds

```
Browser (React 19 + Next.js App Router)
    │ HTTP (Next API)  +  WebSocket (Socket.IO)
    ▼
Node.js HTTP server (server.ts)
    ├─ Next.js handler  (SSR, API routes)
    └─ Socket.IO server (real-time events)
         │
         ▼
Repository layer (src/lib/db/repositories/)
         │
         ▼
SQLite via better-sqlite3 (WAL mode, foreign keys on)
```

Both HTTP and WebSocket share the same port (3000). The server is stateful for
in-memory phase tracking; everything else lives in SQLite as the single source
of truth.

For the full plain-language walkthrough, read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | One project for SSR + API + static |
| UI | React 19 + Tailwind v4 + raw CSS (Aurora) | Strict types, plain CSS for the glassmorphism effects |
| Real-time | Socket.IO 4 | Auto-reconnect, room broadcast, auth middleware |
| Storage | SQLite (`better-sqlite3`) | Synchronous, single file, zero ops |
| Tests | Jest + Playwright | Unit + E2E |
| TS runtime | `tsx` | No compile step in dev |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module-by-module
explanations and design rationale.

---

## Features

- **Real-time anonymous board** — sticky notes appear for everyone within a frame; authors stay anonymous unless they reveal themselves.
- **Consensus heatmap** — votes show up as a percentage badge on each card and a tonal accent (mint/amber/neutral) at strong/mixed/weak consensus.
- **Sprint metrics** — anonymous 1-10 scores per indicator, only team aggregates exposed (average + 10-bucket histogram + submission count).
- **Action items** — track pending work with assignee, due date, completion. Convert any card into an action item in one click.
- **Phase bar with timer** — gather → vote → discuss → action; SM can set per-phase countdowns.
- **Templates** — Aurora classic, Mad/Sad/Glad, Start/Stop/Continue, 4Ls.
- **Reveal / un-reveal** — author chooses whether to put their name on a card.
- **Drag-and-drop between sections** — re-categorize a card without retyping.
- **Tags + filtering** — color tags, room defaults, inline filter.
- **Comments + emoji reactions + drawings** per card.
- **Export** — Markdown / HTML / CSV (Excel-friendly with BOM) / AI-prompt MD ready to paste into ChatGPT.
- **Webhook** — POST a Markdown action-item digest when a room closes (Slack/Teams).
- **Dashboard** — list active and closed retros with section-preview, last-activity, participant/card/action counts.
- **Theme toggle** — animated dark / light with smooth icon morph; SSR-safe hydration.
- **Keyboard shortcuts** — `b` board, `a` actions, `m` metrics, `n` new card, `g h` past retros, `?` help.

---

## Project layout

```
src/
├── app/              Next.js App Router pages + API routes
├── components/       React UI (board, room, action-items, metrics, ui)
├── lib/
│   ├── db/           SQLite connection, schema, migrations, repositories
│   ├── facilitator/  Stage prompts shown in the Guide panel
│   ├── hooks/        useRoom, useTheme, useShortcuts
│   ├── integrations/ Webhook digest helpers
│   ├── socket/       Socket.IO server + handlers + DTO conversion
│   ├── templates/    Retro template definitions
│   ├── types/        Shared types (client + server contracts)
│   └── utils/        Export, CSV, AI prompt, ID, consensus
└── __tests__/
    ├── unit/         Jest tests
    └── e2e/          Playwright tests

server.ts             Custom HTTP server combining Next.js + Socket.IO
docs/
├── ARCHITECTURE.md    Plain-language full walkthrough — start here
├── changelog/         Per-feature change history
├── usage/             User-facing guides
└── technical/         Engineer-facing technical notes
```

---

## Privacy & security highlights

- Authors are anonymous by default. The DB stores `author_id` but the DTO sent
  to clients never includes it; only `isOwnCard` and `authorNickname` (if revealed)
  are exposed.
- Sprint metrics are stored per `(room_id, participant_id, metric_key)` for
  dedup only — `participant_id` never leaves the server.
- Every Socket.IO connection authenticates via `sessionToken`; mutation
  handlers re-check ownership before writing.
- Webhook URLs are filtered through an allowlist (`isAllowedWebhookUrl`):
  HTTPS only, no private IPs.
- All DB queries use prepared statements.

---

## Documentation

- 🟢 **Start here:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture & technology in plain language (mixed Chinese/English).
- 📜 [`docs/changelog/`](docs/changelog/) — per-feature change history (oldest → newest).
- 📖 [`docs/usage/`](docs/usage/) — user-facing how-tos.
- 🔧 [`docs/technical/`](docs/technical/) — design notes per shipped feature.
- 📝 [`AGENTS.md`](AGENTS.md) — repo conventions, especially around Next.js 16's
  breaking changes from previous versions.

---

## License

Internal tool — license TBD.
