# Deployment — teacher-exam

> Full operational reference (architecture decisions, gotchas, bug history) → `docs/ops/PRODUCTION.md`

## Live URLs

| | URL |
|---|---|
| Web | https://ujian-sekolah.faldi.xyz |
| API | https://api-ujian-sekolah.faldi.xyz |
| API health | https://api-ujian-sekolah.faldi.xyz/api/health |

## Architecture

```
ujian-sekolah.faldi.xyz       → web container  (caddy:alpine, Vite SPA)
api-ujian-sekolah.faldi.xyz   → api container  (node:22-alpine + tsx + Hono)
                                   ↕ teacher-exam-private network
                               db container    (postgres:16-alpine)
```

Both subdomains are under the user's existing `faldi.xyz` Cloudflare zone.  
Reverse proxy: `edge-proxy-caddy` (shared, already running on VPS).

## One-Time Setup

### 1. DNS (already done ✅)

`ujian-sekolah` and `api-ujian-sekolah` A records → `103.59.160.70` on Cloudflare.

### 2. Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 Client → Authorized redirect URIs:

```
http://localhost:3001/api/auth/callback/google
https://api-ujian-sekolah.faldi.xyz/api/auth/callback/google
```

### 3. VPS Bootstrap

```bash
ssh vps-faldi
cd ~/projects
git clone https://github.com/naufaldi/teacher-exam.git
cd teacher-exam

cp .env.production.example .env.production
# Fill in all secrets — see docs/ops/PRODUCTION.md for variable reference
chmod 600 .env.production

# Start DB
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build db

# Run migrations
docker compose -f docker-compose.prod.yml --env-file .env.production --profile migrate run --rm migrate

# Start API and web
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api web
```

---

## Deploy / Update

```bash
ssh vps-faldi 'cd ~/projects/teacher-exam && \
  git pull && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build'
```

> If only the API changed: `--build api`  
> If only the frontend changed: `--build web`  
> If schema changed: run migrations step first (see `docs/ops/PRODUCTION.md`)

---

## Rollback

```bash
ssh vps-faldi
cd ~/projects/teacher-exam
git log --oneline -10
git checkout <commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api web
```

---

## Common Ops

```bash
# Container status
ssh vps-faldi 'docker compose -f ~/projects/teacher-exam/docker-compose.prod.yml --env-file ~/projects/teacher-exam/.env.production ps'

# API logs
ssh vps-faldi 'docker logs -f teacher-exam-api-1'

# Caddy logs (SSL / routing issues)
ssh vps-faldi 'docker logs edge-proxy-caddy --tail=100'

# Free Docker disk (run before rebuild if disk < 5 GB free)
ssh vps-faldi 'docker image prune -af && docker builder prune -af'

# DB backup
ssh vps-faldi 'docker exec teacher-exam-db-1 pg_dump -U school_exam school_exam > ~/backups/teacher-exam_$(date +%Y%m%d).sql'
```

---

## Verify Checklist

```bash
curl -sf https://api-ujian-sekolah.faldi.xyz/api/health   # → {"status":"ok"}
curl -sIL https://ujian-sekolah.faldi.xyz | head -5       # → HTTP/2 200 text/html
```

Manual: open `https://ujian-sekolah.faldi.xyz` → Sign in with Google → land on `/dashboard` (not on the API domain).

---

## Environment Variables

See `docs/ops/PRODUCTION.md` for the full reference table.  
See `.env.production.example` for the template.
