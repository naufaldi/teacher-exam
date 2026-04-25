# Deployment — teacher-exam

## Architecture

```
ujiansd.com       → web container  (caddy:alpine, Vite SPA)
api.ujiansd.com   → api container  (node:22 + Hono)
                     ↕ private network
                  db container   (postgres:16-alpine)
```

Reverse proxy: `edge-proxy-caddy` (already running, shared across all apps).
Each container declares `caddy: <domain>` labels; Caddy issues Let's Encrypt certs automatically.

## One-Time Setup

### 1. DNS

Point both `ujiansd.com` and `api.ujiansd.com` A records → `103.59.160.70`.

### 2. Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth client:

Add authorized redirect URI:
```
https://api.ujiansd.com/api/auth/callback/google
```

Keep the existing `http://localhost:3000/api/auth/callback/google` for local dev.

### 3. VPS Bootstrap

```bash
ssh vps-faldi
cd ~/projects
git clone https://github.com/naufaldi/teacher-exam.git
cd teacher-exam

cp .env.production.example .env.production
# Edit .env.production — fill in all values (SESSION_SECRET, GOOGLE_*, ANTHROPIC_API_KEY, POSTGRES_PASSWORD, DATABASE_URL)
chmod 600 .env.production

# Bring up the database first
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build db

# Run migrations (one-shot, exits when done)
docker compose -f docker-compose.prod.yml --env-file .env.production --profile migrate run --rm migrate

# Start API and web
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api web
```

Caddy issues SSL certs on the first request to each domain (may take 10–30 s).

---

## Deploy / Update

```bash
ssh vps-faldi 'cd ~/projects/teacher-exam && \
  git pull && \
  docker compose -f docker-compose.prod.yml --env-file .env.production --profile migrate run --rm migrate && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build'
```

> First build after a fresh pull takes ~5 min (pnpm install + Vite build). Subsequent builds reuse Docker layer cache.

---

## Rollback

```bash
ssh vps-faldi
cd ~/projects/teacher-exam
git log --oneline -10          # find the commit to roll back to
git checkout <commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api web
```

---

## Common Ops

```bash
# Check container status
ssh vps-faldi 'docker compose -f ~/projects/teacher-exam/docker-compose.prod.yml ps'

# Tail API logs
ssh vps-faldi 'docker logs -f $(docker ps -qf name=teacher-exam-api)'

# Tail Caddy logs (SSL/routing issues)
ssh vps-faldi 'docker logs edge-proxy-caddy --tail=100 -f'

# Resource usage
ssh vps-faldi 'docker stats --no-stream'

# Database backup
ssh vps-faldi 'docker exec $(docker ps -qf name=teacher-exam-db) pg_dump -U school_exam school_exam > ~/backups/teacher-exam_$(date +%Y%m%d).sql'
```

---

## Verify Checklist

- [ ] `curl -I https://ujiansd.com` → `HTTP/2 200`
- [ ] `curl -sf https://api.ujiansd.com/api/health` → `{"status":"ok"}`
- [ ] Open `https://ujiansd.com` → app shell loads
- [ ] Sign in with Google → lands on dashboard
- [ ] Create + generate an exam (exercises Anthropic call)
- [ ] Generate Pembahasan on a question
- [ ] `docker logs edge-proxy-caddy --tail=50` → no errors

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DOMAIN` | ✓ | Web domain (`ujiansd.com`) |
| `API_DOMAIN` | ✓ | API domain (`api.ujiansd.com`) |
| `POSTGRES_USER` | ✓ | DB user |
| `POSTGRES_PASSWORD` | ✓ | DB password |
| `POSTGRES_DB` | ✓ | DB name |
| `DATABASE_URL` | ✓ | `postgresql://user:pass@db:5432/dbname` |
| `SESSION_SECRET` | ✓ | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | ✓ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✓ | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | ✓ | Anthropic API key |
| `VITE_APP_VERSION` | — | Shown in UI (default: `prod`) |
| `VITE_BUILD_ID` | — | Build identifier (default: `prod`) |
