# 2026-05-02 — 路線圖最後一波 + 5 項使用者修正

**Date:** 2026-05-02
**Status:** Shipped
**Plan reference:** `~/.claude/plans/ui-ux-retro-purring-feather.md`
**Predecessors:** `2026-05-01-wave1-desktop-polish.md`, `2026-05-01-wave2-wave3-shipped.md`

## 摘要

把原本延後的 5 個 plan 項目 + 5 個使用者後續修正一次補上。原始路線圖至此全部交付。

## 使用者修正（5 項）

1. **移除 enlarge / density 切換按鈕** — 卡片右下角的「展開」與 header 的 cozy/compact 切換移除；CSS 規則與 useDensity hook 一併刪除
2. **亮色模式按鈕配色** — `.btn-primary` 在亮色模式下從 oklch(0.50/0.55) 提亮到 oklch(0.66/0.72)，加上紫色陰影與更明顯的文字陰影
3. **AI prompt + Guide 中文化** — `aiExportTemplate.ts`、`facilitator/prompts.ts`、`FacilitatorPanel.tsx`、`RoomHeader` 的相關文案全部翻成繁體中文
4. **Action items + Sprint metrics 升級為主分頁** — 移除右側欄；改成 header 下方一排 tab：「回顧棋盤 / Action items / Sprint metrics」，每個 tab 都是完整版面
5. **跳過暱稱輸入直接進房** — Dashboard 點擊 active room 直接到 `/room/[id]`；該頁偵測沒有 sessionToken 時自動產生 `Guest-XXXXX` 暱稱並 POST `/api/rooms/[id]/participants`

## Wave 3.2 — CSV 匯出

- 新 `lib/utils/csvExport.ts` 產生 RFC 4180 規範 CSV，含 `type` 欄區分 cards 與 action_items
- BOM 加在前面避免 Excel 開繁體中文 mojibake
- API 新增 `format=csv` 分支，header 多一個「CSV」按鈕

## Wave 3.3 — Action item Webhook digest

- `rooms.webhook_url` 欄位（idempotent ALTER TABLE migration）
- `roomRepo.updateWebhook(id, url)`
- `/api/rooms/[id]/webhook` GET/PUT，sessionToken 從 `x-session-token` header 帶入
- `isAllowedWebhookUrl()` 擋掉非 http(s) 與 localhost / 127.0.0.1 / 0.0.0.0
- `buildActionItemDigestMarkdown()` 產 Slack mrkdwn checklist
- `sendActionItemDigest()` 8 秒 timeout、fire-and-forget、錯誤吞掉只 log
- 關房 socket handler 在廣播 `ROOM_CLOSED` 後非同步觸發 webhook
- `RoomSettingsModal` 中文 UI（autoFocus URL input、masked 顯示、儲存/清除按鈕）
- Header 加齒輪設定按鈕

## Wave 3.4 — History 頁匯出增強

- 既有 `/room/[id]/history` 頁已包含完整資料；不另開 sub-route
- 加入「複製 AI prompt」按鈕（與 RoomHeader 同 UX）
- 加入「匯出 CSV」按鈕
- 既有 MD/HTML 按鈕標籤翻成中文

## Wave 2.1 — Phase flow + 計時器

- `RoomPhase` 型別（gather / vote / discuss / action / closed）+ `RoomPhaseState`
- 伺服器 in-memory `phase-store` keyed by roomId（重啟會重置，可接受）
- 新 socket events `PHASE_SET` / `PHASE_UPDATED`；ROOM_JOINED 帶 phaseState
- `useRoom` 訂閱 PHASE_UPDATED 並提供 `setPhase(phase, durationSec?)`
- 新 `PhaseBar` 元件：顯示 4 個階段 pill（high-light 當前、淡化過去）+ 倒數計時 mm:ss + SM 快速計時器（無計時 / 3 / 5 / 10 / 15 分）
- 設計 advisory：phase 不限制任何動作，只是 UI 提示

## Wave 2.7 — Retro 模板

- 4 個模板：Aurora 經典版、Mad/Sad/Glad、Start/Stop/Continue、4 Ls
- `rooms.template_id` 欄位（idempotent migration，default 'classic'）
- 模板只改 emoji + label，4 個 section key 不變 — 卡片資料不需要 migration
- Dashboard 「New retro」modal 加 radio group，每個模板顯示標題、描述、4 個 section emoji 預覽
- Dashboard 卡片預覽根據 `room.templateId` 顯示對應 emoji + label
- Section / SectionFullscreen 接受 `template?` prop

## Files

**新增：**
- `src/lib/utils/csvExport.ts`
- `src/lib/integrations/digest.ts`
- `src/app/api/rooms/[roomId]/webhook/route.ts`
- `src/components/room/RoomSettingsModal.tsx`
- `src/components/room/PhaseBar.tsx`
- `src/lib/socket/phase-store.ts`
- `src/lib/templates/index.ts`

**刪除：**
- `src/lib/hooks/useDensity.ts`（已不使用）

**修改（重要）：**
- `src/app/api/rooms/[roomId]/export/route.ts` — `format=csv` 分支
- `src/app/api/rooms/route.ts` — 接受 `templateId`、回傳 `joinUrl=/room/{id}`
- `src/app/globals.css` — 亮色模式按鈕配色、移除 density/size 規則
- `src/app/page.tsx` — 模板選擇器、跳過 join 直接連 board
- `src/app/room/[roomId]/page.tsx` — 自動產生 Guest 暱稱
- `src/app/room/[roomId]/history/page.tsx` — AI prompt 複製 + CSV 匯出
- `src/components/board/Card.tsx` — 移除 size 切換
- `src/components/board/Board.tsx` / `Section.tsx` / `SectionFullscreen.tsx` — template prop
- `src/components/room/RoomBoard.tsx` — 主分頁 tab、phase bar、settings modal、template
- `src/components/room/RoomHeader.tsx` — 移除 density toggle、CSV 按鈕、設定按鈕、中文化
- `src/components/room/FacilitatorPanel.tsx` — 中文化
- `src/lib/db/schema.ts`、`migrations.ts`、`repositories/room.repo.ts` — webhook_url + template_id 欄位
- `src/lib/socket/events.ts`、`handlers/room.handler.ts` — webhook digest + phase events
- `src/lib/hooks/useRoom.ts` — phase state 整合
- `src/lib/types/index.ts` — Room / RoomSummary / RoomJoinedPayload 擴充
- `src/lib/utils/aiExportTemplate.ts` — 中文 prompt 與資料標籤
- `src/lib/facilitator/prompts.ts` — 中文化 + 五階段提示

**Commit history（這個 session）：**
- `refactor(room): top-level tabs, auto-join, Chinese guide, simpler card chrome`
- `feat(export): CSV export with cards + action items in one sheet (3.2)`
- `feat(integrations): action item webhook digest + history page exports (3.3 + 3.4)`
- `feat(room): advisory phase bar + per-stage countdown timer (2.1)`
- `feat(templates): retro template picker with 4 starter layouts (2.7)`

## 路線圖完成度

| Wave | 數量 | 狀態 |
|---|---|---|
| Wave 1 — 桌面打磨 | 9/9 | ✅ |
| Wave 2 — 主持人工作流 | 7/7 | ✅ (2.7 為簡化版，保留 4 區塊結構) |
| Wave 3 — 產出豐富化 | 5/5 | ✅ (3.2 略過 PDF，CSV + browser print-to-PDF 替代；3.4 強化既有 history 頁) |
| Wave 4 — 策略性洞察 | 0/4 | 標示為選用，未開工 |

## 驗證

- `next build` 過程中無 error
- iframe 內測試：自動 Guest 暱稱進房、3 主分頁切換、phase bar 顯示、webhook 設定 modal、亮色按鈕亮度提升
- 路線圖中所有 H/M-impact 項目都已交付

## 後續可選

- Wave 4.1 metric trend deltas + alerts
- Wave 4.2 房內多輪 metric 提交
- Wave 4.3 team_slug / room-of-rooms
- Wave 4.4 action items 帶到下一場
- 真正不同 section 數量的模板（schema 改動較大）
- PDF 匯出（puppeteer/playwright）
