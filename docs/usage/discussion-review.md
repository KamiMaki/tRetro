# 討論與檢視 — Discussion & Review

RetroXpert 的每個 retro 房間，除了原本的 **Board / Action items / Sprint metrics**
之外，新增兩個分頁：**Discussion（討論）** 與 **Review（檢視）**。兩者都是
看同一批卡片，只是用不同方式呈現。

## 怎麼打開

進入房間後，在上方分頁列點 **Discussion** 或 **Review**。
也可以用鍵盤快捷鍵：

| 按鍵 | 功能 |
|------|------|
| `b`  | Board 分頁 |
| `d`  | Discussion 分頁 |
| `r`  | Review 分頁 |
| `a`  | Action items 分頁 |
| `m`  | Sprint metrics 分頁 |

## Discussion（討論）— 逐張聚焦

適合 **Scrum Master 帶會議**：把卡片依 tag 分組，一次聚焦一張、逐一走過。

畫面分三欄：

- **左：卡片佇列（Queue）** — 目前這個 tag 群組裡的所有卡片預覽。
  點任一張可直接跳過去；已經走過的會變淡，已決策的會帶上 action / park 標記。
- **中：聚焦卡片** — 放大顯示目前討論的卡片（含 tag、繪圖、reactions）。
  下面有兩顆決策按鈕：
  - **➜ Action item** — 點下去會 **直接建立一個 action item**（內容＝這張卡）。
    建好之後按鈕變成「✓ Action item added」，再點一次也不會重複建立。
  - **⏸ Park it** — 先擱置、晚點再深談的橘色標記（只是視覺標記，可再點取消）。
  用 **← Prev / Next →** 在卡片與群組之間移動。
- **右：留言（Comments）** — 顯示目前聚焦卡片的留言串，並可直接在下方
  輸入框新增留言；留言會即時同步給房裡所有人。底部顯示目前已建立幾個
  action item。

上方的 **tag 群組列** 顯示每個 tag 有幾張卡，點一下就切換到該群組。
沒有 tag 的卡片會集中在 `untagged` 群組。

## Review（檢視）— 一次展開全部

適合 **整桌一起回顧**：四個區塊（Went Well → Didn't Go Well → Thanks →
Deep Discussion）由上到下排列，每張卡片都完整展開。

- **工具列** 顯示總卡片數、留言數，並提供 **tag 篩選**。
- **Expand all comments / Collapse all comments** — 一鍵展開或收合
  *所有* 卡片的留言串。
- 每個區塊標題旁也有自己的 **Expand section / Collapse section**。
- 每張卡片下方點 **「N comments / show」** 可單獨展開該卡的留言串，
  並直接在裡面回覆 — 回覆會即時同步給房裡所有人。
- 卡片若有繪製的圖片，會顯示縮圖，點一下可放大檢視。
- Review 是純檢視頁面，不提供決策按鈕。

## 注意事項

- **Park 標記只存在當前瀏覽階段** — 重新整理頁面就會清空，
  它是幫助主持人現場分流用的，不會寫進資料庫。
- **Action item 例外** — 它會真的建立一筆 action item，出現在 Action items 分頁。
- 留言（comments）是真實的、會即時同步並永久保存的。
- Discussion 與 Review 看到的卡片，就是 Board 上的同一批卡片。
