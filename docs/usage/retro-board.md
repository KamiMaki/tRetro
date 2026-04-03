# tRetro 使用指南

## 快速開始

```bash
npm install
npm run dev
```

瀏覽器開啟 http://localhost:3000

## 使用流程

### 1. 建立房間
- 在首頁輸入房間名稱（例如「Sprint 42 Retro」）
- 點擊「Create Room」
- 系統會導向加入頁面

### 2. 加入房間
- 輸入你的暱稱
- 點擊「Join Room」
- 第一位加入的人自動成為 Scrum Master
- 將連結分享給團隊成員

### 3. 填寫卡片
看板分為四個區塊：
- **Went Well** (綠色) — 做得好的事情
- **To Improve** (紅色) — 需要改進的地方
- **Thanks** (藍色) — 感謝的人或事
- **Deep Dive** (紫色) — 想深入討論的主題

每張卡片可以：
- 輸入文字內容
- 選擇或新增標籤（tag）
- 所有人即時看到新卡片

### 4. 匿名機制
- 所有卡片預設匿名，沒有人知道誰寫的
- 如果你想表明身份，可以點擊自己卡片上的「Reveal」按鈕
- 揭露身份後無法撤回

### 5. Scrum Master 功能
Scrum Master 額外擁有：
- **標籤篩選**：按標籤過濾卡片
- **排序**：按時間或標籤數量排序
- **Action Items**：新增、編輯、刪除待辦事項（指派負責人、設定截止日期）
- **匯出**：下載 Markdown 或 HTML 格式的會議紀錄
- **關閉房間**：結束 retro 會議

### 6. 匯出會議紀錄
Scrum Master 可匯出包含：
- 各區塊的卡片摘要
- 標籤統計表
- Action Items 清單（含負責人與截止日期）

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| PORT | 3000 | 伺服器 port |
| NODE_ENV | development | 環境模式 |
| DATABASE_PATH | data/retro.db | SQLite 資料庫路徑 |
