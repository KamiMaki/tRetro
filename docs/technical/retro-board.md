# tRetro 技術文件

## What Changed
全新專案，從零建立匿名即時回顧看板系統。62 個檔案，涵蓋前後端完整實作。

## Why
團隊需要一個輕量、無帳號、匿名的 retro board 工具，支援即時協作與會議紀錄匯出。

## How It Works

### 架構概覽

```
Browser (React)                    Server (Node.js)
┌─────────────────┐               ┌──────────────────────┐
│ Next.js App      │               │ Custom HTTP Server    │
│ ├─ Pages         │   HTTP        │ ├─ Next.js Handler    │
│ ├─ Components    │◄────────────►│ ├─ API Routes         │
│ └─ Hooks         │               │ └─ Socket.IO Server   │
│                  │   WebSocket   │     ├─ Middleware      │
│ Socket.IO Client │◄────────────►│     ├─ Room Handler    │
│                  │               │     ├─ Card Handler    │
└─────────────────┘               │     ├─ Tag Handler     │
                                   │     └─ AI Handler      │
                                   │                        │
                                   │ SQLite (better-sqlite3) │
                                   └──────────────────────┘
```

### 核心設計決策

#### 1. CardDB / CardDTO 分離（匿名保護）
- `CardDB`：伺服器端型別，包含 `authorId`
- `CardDTO`：客戶端型別，**不含** `authorId`，改用 `isOwnCard: boolean`
- `toCardDTO()` 函式在 Socket handler 廣播時轉換，**逐 socket 發送**確保每個使用者拿到正確的 `isOwnCard` 值
- 這確保了即使開啟 DevTools 也無法看到其他人的身份

#### 2. Session Token 認證
- 加入房間時伺服器產生 `crypto.randomUUID()` 作為 session token
- 存入 `sessionStorage`（非 localStorage，分頁關閉即失效）
- Socket.IO middleware 驗證 token 而非 participantId
- 防止透過竄改 sessionStorage 冒充其他人

#### 3. 自訂 HTTP Server
- `server.ts` 使用 `createServer()` 將 Next.js 和 Socket.IO 掛載在同一 HTTP server
- 單一 port、無 CORS 問題
- 適合 SQLite 單程序特性

#### 4. 權限模型
| 操作 | 權限 |
|------|------|
| 新增卡片 | 所有成員 |
| 編輯卡片 | 僅作者 |
| 刪除卡片 | 作者 + SM |
| 揭露身份 | 僅作者（不可逆） |
| 管理 Action Items | 僅 SM |
| 篩選/排序 | 僅 SM |
| 匯出 | 僅 SM |
| 關閉房間 | 僅 SM |

### 模組關係圖

```
src/
├── app/                    # Next.js App Router（頁面 + API）
│   ├── api/rooms/          # REST API（建立房間、加入、匯出）
│   └── room/[roomId]/      # 動態路由（加入頁、看板頁）
├── components/             # React UI 元件
│   ├── board/              # 看板核心（Board, Section, Card, CardForm）
│   ├── room/               # 房間管理（Header, Join, Create）
│   ├── action-items/       # Action Items（List, Form, Card）
│   └── ui/                 # 通用 UI（Toast）
├── lib/
│   ├── db/                 # SQLite 資料層
│   │   ├── repositories/   # 5 個 Repository（Room, Participant, Card, Tag, ActionItem）
│   │   ├── connection.ts   # Singleton DB 連線
│   │   └── schema.ts       # CREATE TABLE SQL
│   ├── socket/             # Socket.IO 伺服器端
│   │   ├── handlers/       # 4 個事件 Handler
│   │   ├── dto.ts          # CardDB → CardDTO 轉換
│   │   └── middleware.ts   # Session Token 驗證
│   ├── hooks/              # React Hooks（useSocket, useRoom）
│   ├── context/            # SocketContext Provider
│   ├── types/              # TypeScript 型別定義
│   └── utils/              # 工具函式（ID、匯出、常數）
└── __tests__/              # 測試（8 suites, 92 tests）
```

### Socket.IO 事件流

```
Client                          Server                         All Clients
  │                               │                               │
  ├── card:create ──────────────► │                               │
  │                               ├── validate                    │
  │                               ├── cardRepo.create()           │
  │                               ├── toCardDTO(card, viewerId)   │
  │                               ├──────── card:created ────────►│ (per-socket)
  │                               │                               │
  ├── card:reveal ──────────────► │                               │
  │                               ├── verify authorId match       │
  │                               ├── cardRepo.reveal()           │
  │                               ├──────── card:revealed ───────►│ (broadcast)
```

### 資料庫 Schema
6 張表：`rooms`, `participants`, `cards`, `tags`, `card_tags`, `action_items`
- 所有 ID 使用 nanoid（rooms: 8 chars, 其他: 12 chars）
- SQLite WAL mode + busy_timeout=5000ms
- Foreign keys 啟用，CASCADE delete

## Usage

```bash
# 開發
npm run dev

# 建置
npm run build

# 正式環境
npm start

# 測試
npm test
```

## Caveats
- **無法部署至 Vercel**：自訂 server 不相容 Vercel 的 serverless 架構
- **SQLite 限制**：不支援水平擴展，適合 ≤10 人的小團隊
- **sessionStorage**：關閉分頁後需重新加入房間
- **nanoid v3**：使用 v3（CommonJS），v4+ 為 ESM-only 可能與 better-sqlite3 衝突
- **無離線佇列**：斷線期間的操作不會暫存，重連後從伺服器重取完整狀態
