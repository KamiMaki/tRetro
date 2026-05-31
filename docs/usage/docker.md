# 用 Docker 執行 tRetro

## 映像位置
Docker Hub：**`penguin88428/retroxpert:latest`**

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
本系統登入密碼是「當天台北日期」`yyyymmdd`（例：2026-05-31 → `20260531`）。

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
