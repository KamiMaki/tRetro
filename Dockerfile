# syntax=docker/dockerfile:1.7
#
# tRetro — multi-stage build. The production runtime is `tsx server.ts` so we
# ship the source plus the `.next/` build output. SQLite lives on a mounted
# volume controlled by the DATABASE_PATH env var.

# ───── deps: install all dependencies (incl. dev — needed for `next build`)
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 ships prebuilt binaries for linux/amd64 + arm64 but falls back
# to source compile on niche platforms. Installing build tools keeps that path
# working without a separate stage.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ───── build: produce the Next.js `.next/` artefacts
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ───── runtime: copy what we need + drop devDeps to shrink the image
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/retro.db \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json package-lock.json ./
COPY tsconfig.json next.config.ts ./
COPY server.ts ./
COPY src ./src

# Drop dev-only deps to shrink the final layer; tsx, better-sqlite3, next, and
# socket.io are all listed under `dependencies` so they survive the prune.
RUN npm prune --omit=dev \
 && npm cache clean --force

# Persist SQLite outside the container.
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

# Healthcheck hits the dedicated /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "start"]
