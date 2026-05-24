# Technical — Discussion & Review tabs (RetroXpert)

## 這次改了什麼（What Changed）

### 新增
- `src/components/discussion/DiscussionPanel.tsx` — 討論 / Focus 模式。
- `src/components/discussion/ReviewPanel.tsx` — 檢視 / Overview 模式。

### 修改
- `src/components/ui/Aurora.tsx` — `Logo` 改為 RetroXpert 標誌（`RX` 字樣的
  漸層玻璃方塊 + `Retro`/漸層`X`/`pert` wordmark），新增 `wordmark` prop，
  漸層 `id` 改用 `useId()` 避免多個 logo 同頁衝突。
- `src/components/room/RoomBoard.tsx` — `MainTab` 型別加入 `discussion`、
  `review`；新增兩個 tab、兩個 tabpanel、以及 `d` / `r` 鍵盤快捷鍵。
- `src/app/layout.tsx`、`src/app/page.tsx`、`src/app/login/page.tsx` —
  品牌字串 tRetro → RetroXpert。
- `package.json` — `name` → `retroxpert-app`。
- `README.md` — 標題與簡介。

## 為什麼這樣做（Why）

- **拆成兩個 tab 而非一個含 segmented control 的畫面**：設計稿
  (`screen-discussion.jsx`) 用一個 Discussion screen 內含 Overview/Focus
  切換鈕。但本專案的房間本來就是 tab 結構，使用者也明確要求「tabs inside a
  room」。因此把兩個模式各自獨立成一個 tab，tab 列本身就取代了 segmented
  control 的角色。
- **不新增 socket 事件、不改 schema**：兩個 panel 都是呈現層，吃
  `useRoom()` 既有的 `cards: CardDTOv2[]`。需要寫入後端的動作全部重用既有
  事件 —— 留言走 `comment:create`、Action item 走 `addActionItem`。Park
  標記維持 local session-only state。這讓整個功能可以零風險地疊加在現有
  即時系統之上。
- **Review 是純檢視頁**：移除所有決策控制，只保留卡片內容、tag、繪圖、
  reactions 與留言串，避免和 Discussion 的主持職責重疊。
- **留言串重用 `CommentList`**：Discussion 左欄與 Review 展開的留言都用同
  一個元件，回覆即時同步且持久化。

## 怎麼運作的（How It Works）

```
RoomBoard (tab 容器)
  ├─ useRoom()  ──►  cards / tags / addComment ...
  ├─ tab: board       → Board
  ├─ tab: discussion  → DiscussionPanel { cards, onAddComment, onCreateActionItem }
  ├─ tab: review      → ReviewPanel { cards, template, onAddComment }
  ├─ tab: actions     → ActionItemList
  └─ tab: metrics     → MetricsPanel
```

所有 tabpanel 同時掛載、用 `display:none` 切換（沿用既有作法），所以切
tab 不會丟失 panel 內的 local state（決策標記、展開狀態、目前聚焦卡）。

### DiscussionPanel（Focus）
1. `useMemo` 把 `cards` 依 `tag.id` 分組；一張卡有 N 個 tag 就出現在 N 組，
   無 tag 的卡集中在 `__untagged__`。群組依卡片數由多到少排序。
2. State：`tagIdx`（目前群組）、`cardIdx`（群組內位置）、`decisions`
   （`Record<cardId, Decision>`，`Decision = 'action' | 'park'`）。
3. `next()` / `prev()` 在「群組內移動」與「跨群組」之間銜接。索引用
   `Math.min(...)` 收斂，卡片數變動時不會越界。
4. 版面是 `grid-template-columns: 260px 1fr 300px` — 卡片佇列 / 聚焦卡 /
   留言。左欄是卡片預覽佇列（點選跳卡、帶 decision 標記）；右欄渲染聚焦卡
   的 `<CommentList>`（含回覆框），`key={focused.id}` 讓切卡時輸入狀態重置，
   底部並顯示已建立的 action item 數。
5. `markAction()` 呼叫 `onCreateActionItem(focused.content)` 真的建立一筆
   action item，並用 `decisions[id] === 'action'` 當 guard 防止重複建立。
   `togglePark()` 只切換本地 `'park'` 標記（橘色，`var(--aurora-amber)`）。
6. 聚焦卡若有 `card.drawings` 會渲染 `<DrawingThumbnail>`（view-only）。

### ReviewPanel（Overview）
1. State 只有 `expanded`（`Record<cardId, boolean>`）與 `filter`
   （`'all'` 或某個 `tag.id`）—— 無決策狀態，是純檢視頁。
2. **展開全部** 用一個 helper `setMany(ids, value)` 一次重建 `expanded`
   map；section 層級的展開鈕只對該 section 的 card id 套用。
3. 四個區塊照 `SECTIONS` 順序由上到下排，tone 取自 `SECTION_TONES`，
   區塊標題用 `color-mix()` 畫出對應的色帶。
4. 卡片展開時渲染 `<CommentList>`，因此回覆直接接到既有 socket flow。
   卡片若有繪圖則渲染 `<DrawingThumbnail>`（view-only）。

## 怎麼使用（Usage）

```tsx
// RoomBoard.tsx — 兩個 tabpanel
<div id="main-panel-discussion" hidden={activeTab !== 'discussion'}>
  <DiscussionPanel
    cards={cards}
    onAddComment={addComment}
    onCreateActionItem={(description) => addActionItem({ description })}
  />
</div>
<div id="main-panel-review" hidden={activeTab !== 'review'}>
  <ReviewPanel cards={cards} template={template} onAddComment={addComment} />
</div>
```

```tsx
// Logo 可選擇是否顯示文字
<Logo size={22} />               // icon + wordmark
<Logo size={28} wordmark={false} /> // 只有 RX icon
```

## 注意事項（Caveats）

- **Park 標記不持久化**：純 local state，重新整理即清空。`Action item`
  例外 —— 它走既有的 `addActionItem` socket flow，會真正建立一筆持久化的
  action item。
- **品牌改名僅限可見字串**：localStorage key（`tretro-theme`、
  `tretro-share-mode`、`tretro-tools-open`）、drag MIME type
  (`application/x-tretro-card`)、DB 路徑、Docker image tag、k8s manifest
  皆維持原樣 —— 改動這些會破壞既有的本機 session 與部署，且不屬於設計稿範圍。
- 兩個 tab 對所有參與者可見（未限定 Scrum Master）。決策為 local state，
  無權限風險。
- 預覽截圖工具會因 aurora `backdrop-filter` 過重而 timeout；驗證改以
  accessibility snapshot 與 DOM eval 進行。
