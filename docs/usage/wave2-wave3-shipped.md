# Wave 2 + Wave 3 使用指南：facilitator 工作流 + 產出橋樑

承接 Wave 1（桌面打磨）。這一波加進真正改變 retro 跑法的功能：共識熱力、卡片→action 一鍵轉換、AI 摘要橋樑、主持人指南，以及一些日常會用到的修正。

## 新功能逐一介紹

### 1. 每個人都是 SM（共享主持權）

之前是「第一個進房的人」才是 Scrum Master。現在每位加入者都拿到完整 SM 權限：

- 任何人都能新增 / 完成 action items
- 任何人都能把 retro 關房 / 重新開啟
- 任何人都能匯出
- 沒有「我重新整理瀏覽器就失去 SM 權限了」的窘境

匿名性沒有改變 — SM 權限不顯示在卡片或留言上，只是工具齊全。

### 2. 重新開啟已關閉的 room

關房後反悔了？header 上會出現綠色「Reopen」按鈕（只在已關閉時顯示），按下後立刻廣播給所有在線者，狀態回到 active 並可繼續編輯。

### 3. 投票熱力 + 共識率

一張卡片獲得票數時，會在投票按鈕旁顯示「67%」徽章 — 即「投了這張卡的人 / 房內總人數」百分比：

- **≥ 70%** — 強共識：卡片邊框與光暈染成 mint（綠）
- **40 ~ 70%** — 混合訊號：卡片邊框與光暈染成 amber（琥珀）
- **< 40%** — 弱訊號：保持中性

只顯示比例，不揭露誰投了。SM 在 discuss 階段可一眼看出哪幾張該深聊、哪幾張只是個人意見。

### 4. Sprint metrics 自身分數可視

在 metrics 面板每一行：
- 中央的進度條顯示「團隊平均」
- 條上多了一條 2px 的紫色小刻線，標示**你自己**填的分數位置
- 數字旁顯示 `you · 72`（自己分數）取代原本的「N subs」

只有自己看得到自己的，伺服器永遠不回傳個別分數。

### 5. 卡片內聯標籤選擇器

CardForm 不再有「tags」切換鈕。輸入 textarea 一被聚焦，下方就直接出現所有現有標籤（chip 樣式）：

- 點擊任一個 chip 就加上 / 移除
- 沒選的 chip 半透明，選了的有紫色外框
- 末端「+ tag」按鈕展開成內聯輸入：`# name [add]`，按 Enter 建立

少一次點擊，視覺也更直接。

### 6. 卡片一鍵轉成 action item

每張卡片底部多了一個小綠色 ✅ 圖示。點擊：
1. 側欄自動切到 Action items tab
2. 新增 action item 表單自動展開，描述欄已預填卡片內容
3. 你可以調整描述、指派 owner、設 due date 後送出

不需要手動複製卡片內文。Discuss 階段討論到一半，發現需要追蹤就一鍵帶走。

### 7. 棋盤捲軸 + 卡片大小切換

- 每個區塊現在有自己的捲軸（之前整個頁面會無限變長）
- 棋盤總高自動限制在「視窗 - 180px」內
- **每張卡片右下角有一個展開 / 收起按鈕**：點一下卡片變大（更多 padding、更大字級），方便會議中投影或近距離討論長文卡片
- 全域的「compact / cozy」切換仍然有效；個別卡片的 large 設定會勝過 compact

### 8. Reaction picker 跑版修正

之前 emoji 選擇器在某些卡片位置會錯位（被 backdrop-filter 框住）。現在透過 React portal 直接掛在 `<body>` 下，永遠定位正確。emoji 字型也改用系統 emoji font stack 確保跨平台一致。

### 9. AI 摘要橋樑：「Copy AI prompt」

公司內部沒有 AI API 可串？沒問題。Header 多了一個 **Copy AI prompt** 按鈕（亮色 mint）：

1. 按下 → 系統把以下內容打包複製到剪貼簿：
   - 完整 prompt（角色描述 + 任務指示 + 期望輸出格式）
   - 整場 retro 的 markdown（4 區塊卡片、tag 分布、現有 action items）
2. 直接貼到 ChatGPT / Claude / Gemini / 你公司用的內部 AI 平台
3. 對方會回傳結構化的「主題分群 / 強訊號 / 建議 action items / 開放問題」

中間不需要寫 prompt、不需要整理格式 — 一鍵搞定。

### 10. 主持人指南（Facilitator panel）

Header 上的 **Guide** 按鈕（或快捷鍵 `g f`）開啟側邊抽屜，依五個階段提供：

- **Gather** 🪴 — 收集卡片時的提問與技巧
- **Vote** 🎯 — 投票階段的引導
- **Discuss** 💬 — 討論階段的深度問題
- **Action** ✅ — 制定 action items 的注意事項
- **Wrap & export** 📦 — 結尾的 1 分鐘問題

每個階段都包含：本階段目標、3-4 個戰術 tip、2-4 個可直接念出的提問句。

新手 SM 不再需要憑感覺主持。

## 新增的鍵盤快捷鍵

進入 retro room 後新增：

| 鍵 | 動作 |
|---|---|
| `G` `F` | 開啟 facilitator guide |

其餘 `N` / `A` / `M` / `G` `H` / `G` `D` / `?` 與 Wave 1 相同。

## 不在這一波（將在後續實作）

- Phase flow + 倒數計時器（gather → vote → discuss → action 階段鎖定）
- 多種 retro 模板（Mad-Sad-Glad / Start-Stop-Continue / 4Ls）
- PDF / CSV 匯出格式
- Slack / Discord webhook 摘要寄出
- History 詳情頁（讀取已關閉 retro 完整內容）

## 推薦使用流程（Wave 1 + 2 + 3 整合版）

1. **建立 retro** — Dashboard 按 `N` 或 New retro
2. **取暱稱進入** — 任何人都會是 SM
3. **開 Facilitator guide**（`g f` 或 Header Guide 按鈕）— 看 Gather 階段提示
4. **Brainstorm** — 按 `N` 直接聚焦第一個區塊；卡片用內聯標籤
5. **送出前自查** — 點區塊全螢幕掃過所有卡片
6. **Vote** — 大家平行投票；觀察 mint / amber 邊框找出共識
7. **Discuss** — 按共識度從高到低，把高共識卡片全螢幕逐一討論
8. **建 action item** — 點卡片底部綠色 ✅ 直接轉換
9. **Wrap** — 開 facilitator panel 看 Wrap 提示；按 **Copy AI prompt** 把整場貼到外部 AI 拿主題摘要
10. **關房** — 不滿意可隨時 Reopen
