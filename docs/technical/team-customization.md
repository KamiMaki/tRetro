# 技術文件：團隊客製化、新手導覽與 UX 修正（2026-06-13）

## 這次改了什麼（What Changed）

### 資料層 / Migration
- `src/lib/db/schema.ts`
  - `cards.section`：移除 4 值 `CHECK` 約束 → 自由字串 `section_key`。
  - 新增 `room_sections`、`team_sections` 表（id, *_id, section_key, label,
    emoji, tone, position；`UNIQUE(scope_id, section_key)`）。
  - `teams`：新增 `summary_prompt TEXT`、`reaction_emojis TEXT`（JSON）。
  - `comments`：新增 `updated_at TEXT`（nullable）。
- `src/lib/db/migrations.ts`（皆 idempotent、開機執行）
  - **重建 `cards` 表**以移除 `CHECK`（SQLite 無法 ALTER CHECK）。FK-safe：
    先 `PRAGMA foreign_keys=OFF`，於交易內 `CREATE cards_rebuild → INSERT
    SELECT → DROP → RENAME → 重建索引`，再 `ON`。保留所有欄位與子表列。
  - 為既有房間 backfill `room_sections`（依其 `template_id`）。
  - 守衛式 `ALTER TABLE` 新增 teams/comments 欄位。
- Repos：新增 `room-section.repo.ts`、`team-section.repo.ts`（CRUD + reorder
  + seed/replaceAll）；`room.repo.ts` 建房時 seed 區塊；`team.repo.ts` 新增
  `getSettings/updateSettings`；`comment.repo.ts` 新增 `update`。

### 型別
- `src/lib/types/index.ts`：`SectionType` 由 4 值 union → `string`；新增
  `SectionTone`(5)、`RoomSection`、`TeamSection`、`BoardSectionView`、區塊與
  留言更新的 socket payload 型別；`Comment.updatedAt`；`RoomJoinedPayload`
  帶 `sections` 與 `reactionEmojis`。

### Server / Socket
- `events.ts`：`COMMENT_UPDATE/UPDATED`、`SECTION_CREATE/UPDATE/DELETE/
  REORDER`、`SECTIONS_UPDATED`。
- `handlers/section.handler.ts`（新）、`handlers/comment.handler.ts`（+更新）、
  `room.handler.ts`（ROOM_JOINED 帶 sections + 團隊 reaction 調色盤）、
  `server.ts`（註冊 section handler）、`handlers/limits.ts`（區塊驗證上限）。

### API
- `src/app/api/teams/settings/route.ts`（新）：`GET`（回團隊設定、首次開啟
  seed team_sections）/`PUT`（更新 summary_prompt、reaction_emojis；以陣列
  整批取代 team_sections）。
- `src/app/api/rooms/[roomId]/export/route.ts`：匯出帶入 room_sections 與
  團隊 summary_prompt。

### 前端
- 看板：`Board / Section / SectionFullscreen / ReviewPanel / DiscussionPanel`
  改由 `sections` 渲染；`Card` 接 `tone`/`parkSectionKey`/`reactionEmojis`；
  `ReactionBar` 用團隊調色盤；`CommentList` 內嵌編輯 + `ZoomableImage`；
  `CardForm`/`CommentList` 上傳前檢查大小。
- 元件（新）：`ui/Lightbox.tsx`、`sections/SectionEditor.tsx`、
  `room/RoomSectionsModal.tsx`、`team/TeamSettingsModal.tsx`、
  `room/OnboardingTour.tsx`。
- `useRoom.ts`：收 `SECTIONS_UPDATED`/`COMMENT_UPDATED`，提供 section/comment
  的 emitter 與 `sections`/`reactionEmojis`。
- `RoomBoard.tsx`：組裝 `boardSections`、`parkSectionKey`、Sections 按鈕、
  新手導覽掛載 + 重播；`app/page.tsx` 團隊設定入口。
- 工具：`lib/constants/reactions.ts`（`DEFAULT_REACTION_EMOJIS`）、
  `lib/utils/imageLimits.ts`、`aiExportTemplate.ts`(`DEFAULT_SUMMARY_PROMPT`)。

## 為什麼這樣做（Why）

- **Sections 變成資料而非常數**：使用者要「新增區塊」，4 值 union + DB CHECK
  無法支援。把 section 變成 `room_sections` 資料列，`SectionType` 放寬為
  string，是支援任意區塊的唯一乾淨解。
- **房間快照 vs 團隊預設**：團隊預設（`team_sections`）只當「開新房間的種子」，
  建房時複製進 `room_sections`。如此編輯團隊預設不會回頭改寫已結束的歷史
  retro——歷史穩定、可重現。
- **區塊即時編輯走 socket**：看板本來就是 socket 驅動，區塊調整必須即時同步，
  因此用 `SECTIONS_UPDATED` 廣播整份清單（簡單、最終一致）。團隊設定走 REST
  （非即時、屬設定）。
- **刪區塊不孤兒化卡片**：刪除有卡片的區塊時，server 要求提供搬移目標，否則
  回 `SECTION_NOT_EMPTY`，先搬卡片再刪。
- **匯出含「未分類」**：萬一卡片的 section_key 不在現有清單（區塊被刪），匯出
  仍以「未分類 / Uncategorized」收容，絕不靜默漏卡。
- **圖片先檢查大小**：在 `FileReader` 編碼前用 `file.size` 擋下，體驗較好、也
  避免無謂的 base64 編碼；3M 字元的伺服器上限仍保留為後備。
- **新手導覽用 data-tour 錨點**：以選擇器對準穩定元素，找不到時回退置中，
  不會因為某顆按鈕（如 SM 限定的 Summary Prompt）不存在而壞掉。

## 怎麼運作的（How It Works）

```
建房:  POST /api/rooms → roomRepo.create
         └─ roomSectionRepo.seed(roomId, teamId, templateId)
              team_sections 有 → 複製；否則 → templateSections(templateId)

進房:  socket ROOM_JOIN → room.handler
         emit ROOM_JOINED { …, sections: room_sections,
                            reactionEmojis: team palette ?? defaults }
         useRoom 存進 state → RoomBoard 算 boardSections / parkSectionKey
            → Board/Discussion/Review/Card 依 section 渲染

改區塊(房間):  RoomSectionsModal → useRoom.{create,update,delete,reorder}Section
         → SECTION_* → section.handler → roomSectionRepo
         → io.to(room).emit(SECTIONS_UPDATED { sections })  // 全房同步

改團隊預設/Prompt/Emoji:  TeamSettingsModal → PUT /api/teams/settings
         → teamRepo.updateSettings + teamSectionRepo.replaceAll

匯出 ai:  export route → teamRepo.getSettings(teamId).summaryPrompt
         → buildAiSummaryMarkdown(…, sections, summaryPrompt ?? DEFAULT)

留言編輯:  CommentList 鉛筆 → useRoom.updateComment → COMMENT_UPDATE
         → comment.handler（作者或 SM）→ commentRepo.update
         → 逐 socket emit COMMENT_UPDATED（viewer 正確的 isOwnComment）

新手導覽:  RoomBoard mount → localStorage['tretro-onboarding-seen'] !== '1'
         → OnboardingTour（data-tour 錨點 + 置中回退）→ 完成/跳過寫旗標
```

## 怎麼使用（Usage）

```ts
// 種一個房間的區塊（建房時自動呼叫）
roomSectionRepo.seed(roomId, teamId, templateId);

// 房間區塊即時編輯（client）
const { createSection, updateSection, deleteSection, reorderSections } = useRoom(...);
createSection({ label: '阻礙', emoji: '🚧', tone: 'amber' });
updateSection({ id, label: '新名字', tone: 'cyan' });
deleteSection({ id, moveToSectionKey: 'went-well' }); // 有卡片時需指定搬移目標
reorderSections([idA, idB, idC]);

// 團隊設定（REST）
await fetch('/api/teams/settings');                  // GET 現況（首次會 seed）
await fetch('/api/teams/settings', { method: 'PUT', // 整批存
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ summaryPrompt, reactionEmojis, sections }) });

// ReactionBar 調色盤（fallback 安全）
<ReactionBar cardId={id} reactions={r} onToggleReaction={fn} emojis={reactionEmojis} />
```

## 注意事項（Caveats）

- **`cards.section` 無 FK**：以應用層維護（section_key 對應 room_sections）。
  匯出/看板對未知 key 都有回退（未分類 / 預設 tone），不會壞。
- **Dashboard 卡片的每區塊計數**仍用固定 4 key 的 SQL（`room.repo` 的
  `sectionCounts`）；自訂 key 的卡片計入總數，但不會出現在那 4 個小徽章中。
  屬已知取捨，未來可改為動態查詢。
- **團隊設定權限**：本專案所有參與者皆為 SM（migration 將 `is_scrum_master`
  全設 1），故團隊/房間設定任何人可改——沿用既有信任模型。
- **Migration 一次性重建 `cards`**：FK-safe 且零資料遺失（有單元測試覆蓋
  count + spot value + 子表保留 + idempotency），但屬重量級操作，僅在偵測到
  舊 CHECK 時觸發一次。
- **時間顯示**：DB 存無時區 UTC，一律以 `parseDbDate`/`formatTaipeiTime`
  顯示，勿用 `new Date(dbStr)`（否則台北時間會差 8 小時）。
- **E2E 與新手導覽**：導覽用 localStorage 旗標；e2e global-setup 已在
  storageState 注入 `tretro-onboarding-seen=1`，避免導覽遮罩攔截點擊。
- **reaction_emojis**：以 JSON 字串存；解析失敗/空陣列一律回退預設調色盤。
