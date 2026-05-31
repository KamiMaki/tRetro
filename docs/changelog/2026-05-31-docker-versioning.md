# 2026-05-31 — Docker 版本標籤政策（v1.1）

## 這次做了什麼
- 確立 docker 發佈慣例：固定 repo **`penguin88428/retroxpert`**，每次發佈以 **`vMAJOR.MINOR`** 版本號當 tag，並同步更新 `latest`。
- **進版規則**：取現有最高 `vX.Y`（忽略 git-SHA 等非版本 tag）後 MINOR +1（v1.1 → v1.2 → …）；MAJOR 僅在明確要求時進。
- 將目前 image 標為 **`v1.1`** 並推送，與 `latest` 指向同一個 digest `sha256:7e99e55c…4280d2`。

## 為什麼
使用者要求往後 docker push 一律依此慣例自動執行、不再逐次詢問目的地與版本（已記入持久記憶與 repo 文件）。

## 注意
- repo 上另有早期實驗殘留的 git-SHA tag（`96c14e6`、`c82f332`、`82076b7`、`73d4431`、`ff17d03`）與 `0.1.0`。進版邏輯只看 `vX.Y`，會忽略它們。要清除舊 tag 需在 Docker Hub 網頁／API 操作（docker CLI 無法刪遠端 tag）。
- docker 版本號（vX.Y）與 `package.json` 的 npm 版本各自獨立。
