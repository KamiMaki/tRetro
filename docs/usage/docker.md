# 用 Docker 執行 tRetro

## 映像位置與標籤
Docker Hub：**`penguin88428/retroxpert`**

| 引用方式 | 範例 | 特性 |
|----------|------|------|
| tag `latest` | `penguin88428/retroxpert:latest` | 永遠指向最新一次 push（**可變**，會隨改版移動） |
| tag 版本號 | `penguin88428/retroxpert:v1.2` | **目前最新版本**；每次發佈會進版（v1.2 → v1.3 → …） |
| digest（釘死） | `penguin88428/retroxpert@sha256:a9d92c08…f62b0` | **不可變**，永遠是這一版（用 `@sha256:`，非 `:`） |

目前 `:latest`、`:v1.2`、`@sha256:a9d92c08…` 指向同一個 image。要可重現部署，建議用版本號或 digest，不要只依賴 `latest`。

### 版本標籤政策
- 固定 repo：`penguin88428/retroxpert`（Docker Hub）。
- 每次發佈用 **`vMAJOR.MINOR`** 版本號當 tag，並同步更新 `latest`。
- **進版規則**：取目前最高的 `vX.Y` 版本，MINOR +1（v1.1 → v1.2 → … → v1.9 → v1.10）。MAJOR 只有明確要求時才進。
- 目前最新版本：**v1.2**（2026-06-15）。docker 版本號與 `package.json` 的 npm 版本各自獨立。

## 最快上手
```bash
# 1. 取得映像
docker pull penguin88428/retroxpert:latest

# 2. 啟動（資料存到名為 retro-data 的 volume，網頁開在 3000 埠）
docker run -d --name retro \
  -p 3000:3000 \
  -v retro-data:/data \
  penguin88428/retroxpert:latest

# 3. 開瀏覽器 → http://localhost:3000
```

## 環境變數
| 變數 | 預設 | 說明 |
|------|------|------|
| `PORT` | `3000` | 對外服務埠 |
| `DATABASE_PATH` | `/data/retro.db` | SQLite 檔位置；**請務必掛在 volume 上**，否則容器刪掉資料就沒了 |
| `TZ` | `Asia/Taipei` | 伺服器時區（`server.ts` 已預設台北，通常不必另設） |
| `NODE_ENV` | `production` | 執行模式 |

## 資料持久化（重要）
資料庫是 SQLite，存在容器內 `/data`（映像已宣告為 `VOLUME`）。一定要掛 volume：
- 具名 volume：`-v retro-data:/data`
- 或綁主機目錄：`-v C:\some\path:/data`

不掛 volume 的話，`docker rm` 後資料會一起消失。

## 確認服務正常
映像內建 healthcheck，每 30 秒打一次 `/api/health`。
```bash
docker ps                                   # STATUS 欄會顯示 (healthy)
curl http://localhost:3000/api/health       # {"status":"ok","timestamp":"..."}
```

## 登入密碼
本系統採團隊帳號登入：選擇（或建立）團隊後輸入該團隊密碼即可，無「當日密碼」機制。

## 停止 / 移除
```bash
docker stop retro && docker rm retro
# 資料仍保留在 retro-data volume；要連資料一起刪：
docker volume rm retro-data
```

## 更新到新版
```bash
docker pull penguin88428/retroxpert:latest
docker stop retro && docker rm retro
docker run -d --name retro -p 3000:3000 -v retro-data:/data penguin88428/retroxpert:latest
# DB schema 由 server 啟動時自動 migrate；資料保留在 volume。
```
