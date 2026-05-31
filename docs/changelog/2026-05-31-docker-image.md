# 2026-05-31 — Docker 映像檔打包與發佈

## 這次做了什麼
- 以既有的多階段 `Dockerfile` 將 tRetro（`retroxpert-app`）建置成 production 映像檔。
- 推送到 Docker Hub：**`penguin88428/retroxpert:latest`**。
- Digest：`sha256:7e99e55c97953705edbc649e891501b2b14c873be459609e7064cfae824280d2`
- 映像大小：約 1.07 GB。

## 變更檔案
- **無原始碼變更**。`Dockerfile` 與 `.dockerignore` 為既有且已 commit 的檔案，本次僅用其建置並發佈。
- 新增文件：本變更日誌、[`docs/usage/docker.md`](../usage/docker.md)、[`docs/technical/docker.md`](../technical/docker.md)。

## 驗證（皆有實證）
- `docker build -t tretro:latest .` 成功（exit 0）。
- 容器啟動後 docker healthcheck 在約 4 秒達到 `healthy`。
- `GET /api/health` 回傳 `{"status":"ok"}`。
- 啟動 log：`Database initialized` / `Socket.IO server initialized` / `Environment: production`。
- `docker push` 成功（exit 0），遠端 `latest` digest 與本地建置一致。

## 如何使用（最短路徑）
```bash
docker pull penguin88428/retroxpert:latest
docker run -d -p 3000:3000 -v retro-data:/data penguin88428/retroxpert:latest
# 開 http://localhost:3000
```
詳見 [`docs/usage/docker.md`](../usage/docker.md)。
