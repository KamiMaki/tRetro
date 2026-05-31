# 技術文件：Docker 映像檔打包與發佈

## 這次改了什麼（What Changed）
- **沒有變更原始碼**。`Dockerfile`、`.dockerignore` 已存在於 repo 並已 commit。
- 本次工作：用既有 Dockerfile 建置 → 本機冒煙測試 → 推送到 Docker Hub `penguin88428/retroxpert:latest`。
- 新增三份文件（changelog / usage / technical）。

## 為什麼這樣做（Why）
### 為什麼 runtime 用 `tsx server.ts` 而非 `next start`
tRetro 不是純 Next.js：它用自訂 HTTP server（`server.ts`）把 Next 的 request handler 與 Socket.IO 掛在同一個 HTTP server（即時協作需要 WebSocket）。`next start` 不會起 Socket.IO，所以 production 也得跑 `server.ts`。因為直接執行 `.ts`，runtime 依賴 `tsx`（列在 `dependencies` 而非 `devDependencies`，prune 後仍在）。

### 為什麼是多階段 build
- `deps`：安裝**完整**依賴（含 dev），因為 `next build` 需要 dev 套件（tailwind/eslint/types…）。同時裝 `python3 make g++`，讓 `better-sqlite3` 在非預建平台能 source compile。
- `build`：只負責 `npm run build` 產出 `.next/`。
- `runtime`：複製必要產物後 `npm prune --omit=dev` 砍掉 dev 套件縮小體積。

### 為什麼 SQLite 放 `/data` volume
`better-sqlite3` 寫本機檔，路徑由 `DATABASE_PATH` 控制（預設 `/data/retro.db`）。`/data` 宣告為 `VOLUME`，讓資料庫獨立於容器生命週期，重建容器不掉資料。

### 為什麼 runtime 還做 `apt-get upgrade`
拉進 base image 發佈後的 Debian 安全更新（Dockerfile 註解記錄了當時針對的 libgnutls30 CVE）。掃描器會標記即使實際未用到的套件，升級成本低故保留。

## 怎麼運作的（How It Works）
```
            ┌──────────── deps ────────────┐
host source │ node:20-bookworm-slim        │
   │        │ apt: python3 make g++        │
   │        │ COPY package*.json           │
   │        │ npm ci → 完整 node_modules    │
   │        └──────────────┬───────────────┘
   │                       │ node_modules
   │        ┌──────────── build ───────────┐
   └───────▶│ COPY . .                     │
            │ npm run build → .next/        │
            └──────────────┬───────────────┘
                           │ .next / public / node_modules
            ┌──────────── runtime ─────────┐
            │ NODE_ENV=production           │
            │ DATABASE_PATH=/data/retro.db  │
            │ COPY node_modules .next public│
            │ COPY server.ts src tsconfig   │
            │ npm prune --omit=dev          │
            │ VOLUME /data · EXPOSE 3000    │
            │ HEALTHCHECK → /api/health     │
            │ CMD npm start (tsx server.ts) │
            └───────────────────────────────┘
```
啟動流程（`server.ts`）：設定 `TZ=Asia/Taipei` → `next.prepare()` → 建 `data` 目錄 → `runMigrations()` → 建 HTTP server → 掛 Socket.IO → listen `PORT`。

## 怎麼使用（Usage）
```bash
# 建置
docker build -t tretro:latest .

# 本機跑
docker run -d -p 3000:3000 -v retro-data:/data tretro:latest

# 發佈
docker tag tretro:latest penguin88428/retroxpert:latest
docker push penguin88428/retroxpert:latest

# 驗證遠端 digest
docker buildx imagetools inspect penguin88428/retroxpert:latest
```

## 注意事項（Caveats）
- **單一平台**：目前推送的是 `linux/amd64`（外加一個 attestation/SBOM manifest，inspect 會顯示為 `unknown/unknown`，屬正常）。要支援 arm64 需用 `docker buildx build --platform linux/amd64,linux/arm64 --push`。
- **映像偏大（約 1.07 GB）**：因 runtime 用 `tsx` 直跑 TS，需保留 `node_modules` + 原始碼，無法像 Next standalone 只留精簡輸出。若要縮小，可評估改走 `next build` standalone + 另起 Socket.IO 的架構（屬較大改動）。
- **SQLite 單寫入者**：適合單一容器。橫向擴展（多副本）需改用 client/server DB；目前架構不支援多實例共寫同一 SQLite 檔。
- **`.dockerignore` 已排除 `data`、`.env`、測試與 `docs`**，避免把本機 DB / 祕密 / 測試帶進映像；env 透過 `-e` 或 volume 注入。
- **healthcheck 依賴 `/api/health`**（回 200 + `{status:'ok'}`）；改動該路由要同步留意。
