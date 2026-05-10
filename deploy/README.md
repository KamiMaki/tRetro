# Deploy tRetro to AKS (GitOps style)

This folder is everything you need to ship tRetro to an Azure Kubernetes
cluster:

| File | What it does |
| --- | --- |
| `azure-pipelines.yml` | Azure DevOps pipeline. On every push to `master`, it builds a multi-arch Docker image, pushes `:latest` + `:<git-sha>` to Docker Hub (`penguin88428/tretro`), and bumps the image tag in your config repo so ArgoCD/Flux can roll the new version out. |
| `k8s/tretro.yaml` | One-file manifest with Namespace + PVC + Deployment + Service (Ingress is commented out, uncomment when you wire DNS + cert-manager). |

## Why this looks "simple" — there's no separate database

tRetro stores everything (rooms, cards, votes, action items, metrics) in a
single SQLite file at `DATABASE_PATH` (default `/data/retro.db`). That
file is the entire backend state.

So the deploy is:
1. **One pod** (Next.js + Socket.IO + SQLite all in one container).
2. **One Persistent Volume** mounted at `/data` so the SQLite file
   survives pod restarts.
3. **No DB Pod, no Postgres operator, no managed Azure SQL.**

If you ever need to run more than one replica for HA or load, you'll
have to swap SQLite out first. SQLite is single-writer; two pods sharing
the same file will race on the write lock and corrupt your data. Until
that day comes, this single-pod-with-PVC setup is the right answer:
**simple, cheap, and recoverable from a snapshot of one disk.**

## What the pipeline does, in plain English

1. **Build & push** (every commit on `master`):
   - Logs into Docker Hub via the `dockerhub-penguin` service connection.
   - Uses `docker buildx` to produce a **multi-arch** image
     (linux/amd64 + linux/arm64) so it runs on Intel **and** Ampere
     nodepools.
   - Pushes two tags: `:latest` and `:<git-short-sha>`.
2. **GitOps bump** (only on `master`, only after Build succeeds):
   - Clones a *separate* config repo (e.g.
     `github.com/penguin88428/tretro-config.git`).
   - `sed`-replaces the `image: penguin88428/tretro:...` line in the
     deployment manifest to pin the new SHA tag.
   - Commits + pushes. **ArgoCD or Flux on the cluster sees the change
     and applies it.** No `kubectl` from the pipeline — that's the
     "GitOps" bit.

If you don't have a separate config repo (or ArgoCD/Flux installed yet),
delete Stage 2 and `kubectl apply -f deploy/k8s/tretro.yaml` by hand for
the first deploy. You can add the GitOps loop later.

## One-time AKS setup

```bash
# 1. Create the namespace + apply the manifest:
kubectl apply -f deploy/k8s/tretro.yaml

# 2. (Optional) install ingress-nginx + cert-manager if you want HTTPS:
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

helm upgrade --install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --namespace cert-manager --create-namespace --set installCRDs=true

# 3. Then uncomment the Ingress section in tretro.yaml and re-apply.
```

## Backups

The whole world lives at `/data/retro.db`. Two easy options:

- **Velero** scheduled backups of the `tretro` namespace (PV included).
- **Azure Disk snapshot** of the PVC's underlying disk on a cron.

Both work. If you skip backups, treat the cluster as the only copy and
expect tears the day someone deletes the namespace.

## Testing the image locally before pushing

```bash
docker run --rm -p 3000:3000 -v "$PWD/data:/data" penguin88428/tretro:latest
# → http://localhost:3000 — gate prompts for today's Taipei date.
```

## Connection-timeout notes for Socket.IO behind ingress-nginx

The default ingress-nginx read/send timeout is 60 seconds, which kills
long-lived Socket.IO websockets. The Ingress block in
`k8s/tretro.yaml` already sets:

```yaml
nginx.ingress.kubernetes.io/proxy-read-timeout:  "3600"
nginx.ingress.kubernetes.io/proxy-send-timeout:  "3600"
```

Don't drop those.
