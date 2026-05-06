# tRetro 系統架構與技術說明（白話文）

> 寫給：第一次接觸這個 codebase 的工程師、想了解整體運作的協作者、未來的自己。
> 寫作風格：白話、能用中文就用中文、技術術語保留英文以便對應原始碼。

---

## 一、這個專案是什麼？

**tRetro 是一個即時、匿名的 Sprint 回顧（retrospective）線上工具。**

一句話描述：開一個 retro 房間，貼分享連結，所有人在 4 個區塊（做得好 / 待改進 / 感謝 / 深入討論）匿名貼便利貼，可以投票、留言、畫圖、轉成 action item，最後匯出 Markdown / HTML / CSV / AI 摘要 prompt。

它不是「靜態頁面」，是 **多人即時協作** 的應用：
- A 在台北貼一張卡 → B 在東京 0.x 秒內看到。
- A 投票 → 全房間的票數即刻同步。
- 卡片預設匿名；作者本人可以選擇「reveal」變成署名。

---

## 二、整體架構（一張圖）

```
                     瀏覽器（每個參與者）
        ┌──────────────────────────────────────┐
        │  React 19 + Next.js 16 App Router    │
        │  ─ src/app/page.tsx           Dashboard
        │  ─ src/app/room/[roomId]/...  Retro 房間
        │  ─ useRoom() hook 拿 socket 狀態      │
        └──────────────┬───────────────────────┘
                       │
              ┌────────┴─────────┐
              │                  │
         HTTP (Next API)    WebSocket (socket.io)
              │                  │
              ▼                  ▼
    ┌────────────────────────────────────────┐
    │     Node.js HTTP server (server.ts)    │
    │  ─ Next.js handler 處理 SSR / API      │
    │  ─ Socket.IO server 處理即時事件        │
    │  ─ 兩者共用同一個 HTTP port (3000)     │
    └─────────────────┬──────────────────────┘
                      │
                      ▼
    ┌────────────────────────────────────────┐
    │   Repository 層（src/lib/db/repositories/）│
    │   提供物件導向的 DB 操作介面            │
    └─────────────────┬──────────────────────┘
                      │
                      ▼
    ┌────────────────────────────────────────┐
    │   better-sqlite3                       │
    │   ─ 同步式 SQLite client（無 ORM）     │
    │   ─ 檔案放在 data/retro.db (WAL mode)  │
    └────────────────────────────────────────┘
```

關鍵設計決策：
- **沒有 Redis / 沒有 Postgres**：團隊用的小工具，SQLite 一個檔案就夠。
- **HTTP + WebSocket 共用同一個 port**：`server.ts` 自己起 HTTP，再把 socket.io 接到同一個 server 上。
- **Server 端是 stateful 的**：socket 連線資料留在記憶體；房間狀態仍以 SQLite 為唯一真實來源（single source of truth）。
- **Client 是 thin client**：所有「規則」都在 server 端（誰能 reveal、誰能 close room、票數怎麼算），client 純粹是顯示 + 把使用者操作包成 socket event 丟出去。

---

## 三、技術棧（為什麼選這些）

| 層 | 技術 | 為什麼 |
|----|------|-------|
| 框架 | Next.js 16 (App Router) | 同一個專案處理 SSR、靜態頁、API routes，省一個後端 |
| UI 庫 | React 19 | 配合 Next.js；新版本 hook API 穩定 |
| 即時通訊 | Socket.IO 4 | 比 raw WebSocket 多了自動重連、room broadcast、認證 middleware；做 retro 工具值得這個依賴 |
| 資料庫 | SQLite (`better-sqlite3`) | 單檔、零部署、同步 API、效能對小團隊（<50 人/房）足夠 |
| 樣式 | Tailwind v4 + 原生 CSS | Tailwind 處理一般佈局；Aurora 玻璃感視覺用原生 CSS（`oklch`、`@property`、blur 漸層）寫死 |
| 型別 | TypeScript 5 strict | DB 模型 / DTO / socket payload 都打型別，client 跟 server 共用 |
| 測試 | Jest + Playwright | Jest 跑 repository / dto / utils 單元測試；Playwright 跑 E2E |
| ID 產生 | nanoid v3 | URL-safe 短 id；v3 是 CommonJS 版（與 better-sqlite3 同 runtime） |
| Process | tsx | 跑 TypeScript 不用先編譯 |

---

## 四、資料流：從點擊到資料庫

以「使用者 Alice 在 retro 上貼一張新卡」為例：

```
1. Alice 在 CardForm 按 Send
       │
       ▼
2. RoomBoard.onAddCard(payload)
       │
       ▼
3. useRoom 的 addCard(payload)
       │
       ▼
4. socket.emit('card:create', { roomId, section, content, tagIds })
       │
       ▼ ─ 走 WebSocket ─
       ▼
5. Server: registerCardHandlers 收到 'card:create'
       │
       ▼
6. cardRepo.create(...) 寫進 SQLite
       │
       ▼
7. server 把整張卡轉成 CardDTOv2
       │   （DTO 不含 authorId — 永遠匿名）
       ▼
8. io.to(roomId).emit('card:created', dto)
       │
       ▼ ─ 廣播到房間所有 socket ─
       ▼
9. 每個 client（含 Alice 自己）的 useRoom
        收到 'card:created'，更新 cards state
       │
       ▼
10. React re-render，新卡片出現
```

**為什麼要分 CardDB / CardDTO 兩層？**
- `CardDB` 在 server 端用，含 `authorId`（資料庫真實欄位）。
- `CardDTO` 給 client 看，**沒有** `authorId`。Server 在轉換時看 `viewerParticipantId === authorId` 決定 `isOwnCard`，看 `isRevealed` 決定要不要回傳 `authorNickname`。
- 這層分離是 **隱私的關鍵**：即使 client 攔截 socket 流量，也看不到別人的 author id。

---

## 五、各模組的職責

### 5.1 `src/app/`（路由 + 頁面）

```
src/app/
├── page.tsx                    Dashboard：列出所有 retro，建立新 retro
├── layout.tsx                  Root layout（theme、字型、AuroraBg）
├── room/
│   └── [roomId]/
│       ├── page.tsx            Retro 房間主頁（裝載 RoomBoard）
│       ├── join/page.tsx       加入頁：填 nickname → 拿 sessionToken
│       └── history/page.tsx    過往 retro 唯讀檢視
└── api/
    ├── health/route.ts             健康檢查
    ├── metrics/history/route.ts    歷史 sprint metrics
    └── rooms/
        ├── route.ts                建立房間 / 列出房間
        └── [roomId]/
            ├── route.ts            單一房間查詢
            ├── participants/...    加入參與者（換 sessionToken）
            ├── history/...         匿名歷史
            ├── export/...          匯出 md/html/csv/ai
            └── webhook/...         設定 webhook（房間關閉時 POST 摘要）
```

**只用 HTTP API 的場景**：建立房間、匯出、設定 webhook、健康檢查。
**用 WebSocket 的場景**：所有「在房間裡」的互動。

### 5.2 `src/lib/socket/`（即時通訊核心）

```
src/lib/socket/
├── server.ts          掛 socket.io server、註冊所有 handler
├── events.ts          常數：所有 socket event 名稱（避免拼錯）
├── middleware.ts      authMiddleware：驗證 sessionToken，把 participantId 放進 socket.data
├── dto.ts             toCardDTO / toCardDTOv2 — 把 DB 資料轉成 client 安全的形狀
├── phase-store.ts     in-memory Map，記錄每個房間目前在哪個階段（gather/vote/discuss/...）
└── handlers/
    ├── room.handler.ts        room:join / close / reopen / phase:set
    ├── card.handler.ts        card:create / update / delete / reveal / move
    ├── tag.handler.ts         tag:create / set-default
    ├── action-item.handler.ts action:create / update / delete
    ├── comment.handler.ts     comment:create
    ├── reaction.handler.ts    reaction:toggle
    ├── vote.handler.ts        vote:toggle
    ├── drawing.handler.ts     drawing:create
    └── metric.handler.ts      metrics:submit (匿名 sprint 評分)
```

每個 handler 的形狀都一樣：
1. 從 `socket.data` 拿 `participantId`、`roomId`（已被 middleware 驗證）。
2. 驗證輸入。
3. 呼叫對應的 repo 寫 DB。
4. 廣播事件給整個 room（用 `io.to(roomId).emit(...)`）。

### 5.3 `src/lib/db/`（資料層）

```
src/lib/db/
├── connection.ts      getDb()：lazy 開 SQLite，pragma 設好（WAL、busy_timeout、FK）
├── schema.ts          全部 CREATE TABLE 的 SQL 字串
├── migrations.ts      runMigrations()：跑 schema.ts，啟動時呼叫一次
└── repositories/
    ├── room.repo.ts          Room CRUD + 列表 + 摘要（dashboard 用）
    ├── participant.repo.ts   Participant 加入 / online 切換
    ├── card.repo.ts          Card CRUD + tag 關聯 + reveal/unreveal
    ├── tag.repo.ts           Tag CRUD + 預設標籤
    ├── action-item.repo.ts   Action item CRUD
    ├── comment.repo.ts       留言
    ├── reaction.repo.ts      Emoji 反應 + 摘要查詢
    ├── vote.repo.ts          投票切換 + 計數
    ├── drawing.repo.ts       手繪附件
    └── metric.repo.ts        匿名評分聚合（average + histogram）
```

**設計原則**：
- 沒有 ORM。每個 repo 直接寫 SQL，但用 prepared statement。
- Repo 回傳的是 plain JS object，不是 class instance。
- 資料庫欄位 `snake_case` → JS object `camelCase` 在 repo 內手動轉。

### 5.4 `src/lib/types/index.ts`（共用型別）

> 這是 client 跟 server 唯一共享的「合約」檔。
> 改動 socket payload 時請一起改 types 跟對應的 handler/hook，不要單邊偷改。

關鍵型別：
- `CardDB` — server 真相（含 authorId）
- `CardDTO` / `CardDTOv2` — client 看得到的（去掉 authorId，加上 isOwnCard / 反應 / 票數 / 留言 / 手繪）
- `RoomPhaseState` — 房間目前在哪個 phase + 倒數
- `MetricAggregate` — 一個指標的團隊總和（平均 + 提交數 + 10 格 histogram，**沒有任何個體分數**）

### 5.5 `src/components/`（UI 元件）

```
src/components/
├── board/         便利貼板相關（Section、Card、CardForm、Tag、Vote、Reaction、Drawing）
├── room/          房間外殼（RoomHeader、RoomBoard、PhaseBar、FacilitatorPanel）
├── action-items/  action item list / form / card
├── metrics/       MetricsPanel（匿名 sprint 評分）
├── discussion/    DiscussionPanel（SM-only：tag 分群、parking lot、決策按鈕）
└── ui/            共用視覺基礎（Aurora bg、GlassPanel、Avatar、Logo、Toast、ThemeToggle、KeyboardHelp）
```

最容易讓人迷惑的兩個元件：
- `RoomBoard` 是「房間頁的容器」：呼叫 `useRoom()` 拿狀態，分發給 RoomHeader / Board / ActionItemList / MetricsPanel 等。
- `Section` 跟 `SectionFullscreen` 是同樣內容的兩種佈局；後者點「展開」按鈕後用 `createPortal` 蓋滿視窗，內含同一份 cards/tags 但用 portal 不會破壞 grid 排版。

### 5.6 `src/lib/hooks/useRoom.ts`（client 狀態核心）

這是整個 client 端的大腦：
1. 開一個 socket，認證帶 `sessionToken`。
2. 監聽所有 server 廣播的事件，更新對應的 React state（room、cards、tags、actionItems、metrics、phaseState、participants）。
3. 把所有「使用者操作」包成 callback 回傳（addCard、deleteCard、submitMetrics 等），上層只要 destructure 來用。
4. 連線狀態統一管理（connecting / connected / disconnected / error），讓 UI 顯示 live/offline 狀態。

**特色**：optimistic update **沒有實作**。所有改動都先送到 server，server 確認後廣播回來才更新畫面。寫起來簡單、不會跟伺服器狀態漂移。

### 5.7 `src/lib/templates/`（retro 模板）

提供 4 種預設模板（Aurora 經典版 / Mad-Sad-Glad / Start-Stop-Continue / 4Ls）。
每個模板共用同一組 4 個 section key，只是 label 跟 emoji 不同。
Server 只存 `template_id`，所有渲染由 client 透過 `findTemplate()` 帶入。

### 5.8 `src/lib/integrations/digest.ts`（webhook）

當 SM 在房間設定 webhook URL，房間 close 時會 POST 一份 Markdown 摘要過去（給 Slack / Teams 之類）。
有 SSRF 防護：只允許 https、不允許 private IP。

---

## 六、安全與隱私設計

| 風險 | 對策 |
|------|------|
| 偷看別人是哪張卡作者 | DTO 從不回傳 authorId；reveal 是作者本人主動操作 |
| 偽造其他使用者操作 | 每個 socket 連線必須帶有效 sessionToken（middleware 驗證） |
| 改別人的卡 | Handler 在 mutation 前檢查 `card.authorId === participantId`（除非 SM） |
| 匿名指標被反推 | metric_submissions 表只在 server 端用 (room_id, participant_id, metric_key) 做去重；任何 API 都不回傳 participant_id |
| Webhook SSRF | `isAllowedWebhookUrl` 拒絕 file://、http://、私網 IP |
| SQL injection | 全部用 prepared statement |
| XSS | React 預設 escape；匯出 HTML 用 fixed template，無 raw HTML 注入 |

---

## 七、開發者怎麼跑起來

```bash
# 1. 安裝依賴（一次）
npm install

# 2. 跑開發環境（同時起 Next.js + socket.io，port 3000）
npm run dev

# 3. 跑測試
npm test                 # Jest 單元測試
npm run test:e2e         # Playwright（會自己起 server）

# 4. Lint
npm run lint

# 5. 正式 build
npm run build
NODE_ENV=production npm start
```

第一次跑時 `data/retro.db` 會自動建立，schema 由 `runMigrations()` 帶起。
要清空狀態：直接刪掉 `data/retro.db*`（包含 `-wal` 跟 `-shm`），下次啟動會重建。

---

## 八、目錄速查

```
src/
├── app/              路由與頁面（Next.js App Router）
├── components/       React UI 元件
├── lib/
│   ├── context/      React Context (SocketContext)
│   ├── db/           SQLite 連線、schema、repository
│   ├── facilitator/  Facilitator 引導文案
│   ├── hooks/        useRoom / useTheme / useShortcuts
│   ├── integrations/ Webhook digest
│   ├── socket/       Socket.IO server、events、handlers、DTO
│   ├── templates/    Retro 模板定義
│   ├── types/        共用型別（client + server）
│   └── utils/        export / csvExport / aiExportTemplate / id / consensus
└── __tests__/
    ├── unit/         Jest（repositories / utils / dto）
    └── e2e/          Playwright

server.ts           進入點：起 HTTP + Socket.IO + 跑 migration
next.config.ts      Next.js 設定
tsconfig.json       嚴格 TypeScript
playwright.config.ts E2E 設定
jest.config.ts      單元測試設定
schema.ts (in lib)  所有 CREATE TABLE
docs/               變更紀錄、使用指南、技術文件
```

---

## 九、常見的「為什麼這樣寫」

### Q1: 為什麼自己寫 `server.ts` 而不用 `next start`？

因為要在同一個 HTTP server 上掛 Socket.IO。`next start` 自己控制 HTTP，我們插不進去。
所以開發跟 production 都是 `tsx server.ts`，內部呼叫 Next.js 的 request handler。

### Q2: 為什麼 better-sqlite3 而不是用 async 的 `sqlite`？

better-sqlite3 是 **同步** 的，看似落後其實在 Node 場景下：
- API 簡單，沒有 promise 噪音。
- 整個 query 在 V8 一個 microtask 內完成，沒有 race condition。
- 對團隊內部小工具的負載量，效能完全沒問題（且通常更快）。

### Q3: 為什麼 `CardDTOv2` 不直接合進 `CardDTO`？

歷史包袱。v1 沒有留言/反應/票數/手繪，v2 加上去後保留兩個型別讓舊資料相容。
未來 v3 出來時會考慮把 v2 改名為 `CardDTO`，目前先不動以免動到全 codebase。

### Q4: 為什麼 phase-store 是 in-memory？

階段 (gather/vote/discuss/...) 是「會議現場狀態」，不是業務資料。
重啟伺服器代表會議中斷，重新開始即可。寫 DB 反而徒增複雜度。

### Q5: 為什麼 sprint metrics 不顯示「誰投了什麼」？

刻意設計：匿名是工具核心價值。
即使 SM 也只看得到 average / histogram / 提交數，看不到任何個體分數。
資料庫存 `participant_id` 純粹是為了 dedup（一人一指標一次），永遠不出 API。

---

## 十、想再深入？

- **每個 wave 的設計筆記**：`docs/changelog/`、`docs/usage/`、`docs/technical/`
- **DB schema 完整定義**：[`src/lib/db/schema.ts`](../src/lib/db/schema.ts)
- **Socket event 一覽**：[`src/lib/socket/events.ts`](../src/lib/socket/events.ts)
- **Client 跟 server 的型別合約**：[`src/lib/types/index.ts`](../src/lib/types/index.ts)
