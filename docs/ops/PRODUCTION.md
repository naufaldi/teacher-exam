# Production Reference — teacher-exam

> **Last updated:** 2026-04-26  
> **Status:** Live ✅  
> AI agents: read this entire file before making any infrastructure changes.

---

## Live URLs

| Service | URL | Notes |
|---|---|---|
| Web SPA | https://ujian-sekolah.faldi.xyz | Cloudflare-proxied, Caddy serves `caddy:alpine` |
| API | https://api-ujian-sekolah.faldi.xyz | Cloudflare-proxied, Hono on Node 22 |
| API health | https://api-ujian-sekolah.faldi.xyz/api/health | Returns `{"status":"ok"}` |

Both are subdomains of the user's existing `faldi.xyz` Cloudflare zone (free, no domain purchase needed).

---

## Infrastructure

```
Internet
   │ (80/443 via Cloudflare proxy)
   ▼
edge-proxy-caddy  (lucaslorentz/caddy-docker-proxy:2.8-alpine)
   │  external Docker network: edge
   ├─► ujian-sekolah.faldi.xyz ──► teacher-exam-web-1 (caddy:alpine, :80, /srv)
   └─► api-ujian-sekolah.faldi.xyz ──► teacher-exam-api-1 (node:22-alpine, :3001)
                                             │
                                   Docker network: teacher-exam-private
                                             │
                                       teacher-exam-db-1 (postgres:16-alpine, :5432)
                                             │
                                       named volume: db_data
```

**VPS:** `103.59.160.70`, user `naufaldi`, SSH alias `ssh vps-faldi`  
**Project path on VPS:** `~/projects/teacher-exam`  
**Compose file:** `docker-compose.prod.yml`  
**Env file:** `.env.production` (secrets, never committed)

---

## Key Architecture Decisions

### 1. Subdomain split, not path-based routing

Web and API live on separate subdomains (`ujian-sekolah` vs `api-ujian-sekolah`) rather than a single domain with `/api` path routing. This mirrors the proven `viralkan-app` pattern already on the VPS and avoids Caddy label complexity.

**Implication:** CORS and cookie configuration must account for cross-origin requests from the web origin to the API origin (both share `faldi.xyz` eTLD+1, so `SameSite=Lax` cookies work without extra config).

### 2. tsx at runtime, no tsc build step

The API Dockerfile does **not** compile TypeScript with `tsc`. It runs:
```
node --import tsx/esm src/index.ts
```
from `WORKDIR /app/apps/api`.

**Why:** The workspace packages (`@teacher-exam/db`, `@teacher-exam/shared`) declare `"main": "./src/index.ts"` (TypeScript source). A plain `tsc` build would emit JS that imports TypeScript source files, which Node cannot execute. Using `tsx` at runtime is the same mechanism as the dev server and requires zero build step.

**Critical:** `WORKDIR` must be `/app/apps/api` (not `/app`). The `--import tsx/esm` loader resolves packages from the **current working directory**. Since `tsx` is declared in `apps/api/package.json` (not the root), it lives in `apps/api/node_modules/tsx` — only reachable if CWD is inside `apps/api`.

### 3. Vite bakes VITE_API_URL at build time

`VITE_API_URL` is set via Docker build arg in `docker-compose.prod.yml`:
```yaml
args:
  VITE_API_URL: https://${API_DOMAIN}/api
```

This means the production JS bundle has the API host hardcoded. **Any domain change requires a `--build` flag** when redeploying the web container, not just a restart.

### 4. better-auth requires BETTER_AUTH_URL separate from APP_URL

| Env var | Value | Purpose |
|---|---|---|
| `APP_URL` | `https://ujian-sekolah.faldi.xyz` | Web app host — used as `trustedOrigins` in better-auth |
| `BETTER_AUTH_URL` | `https://api-ujian-sekolah.faldi.xyz` | API host — used as better-auth `baseURL` for OAuth callback URL construction |

If `BETTER_AUTH_URL` is not set separately (or defaults to `APP_URL`), Google's OAuth callback redirect goes to `api-ujian-sekolah.faldi.xyz/api/auth/callback/google` but then better-auth redirects the user back to `ujian-sekolah.faldi.xyz/dashboard` only if the post-auth `callbackURL` is absolute. See Bug #2 below.

### 5. Cloudflare proxy + Let's Encrypt: gray-cloud first

When Cloudflare proxy is **enabled (orange cloud)**, Caddy can still issue Let's Encrypt HTTP-01 certs because Cloudflare proxies `/.well-known/acme-challenge/*` to origin. However, this requires Cloudflare SSL/TLS mode to be **"Full"** or **"Full (strict)"**, not "Flexible".

**Recommended first-boot sequence:**
1. Set CF records to **DNS only (gray cloud)**
2. Start containers — Caddy issues certs unimpeded
3. Once certs are issued (`docker logs edge-proxy-caddy | grep "certificate obtained"`), re-enable **Proxied (orange cloud)** and set SSL mode to **Full (strict)**

For our deployment, certs issued successfully even with Cloudflare proxy on (CF was in "Full" mode by default on `faldi.xyz`).

---

## Bugs Encountered and Fixed (2026-04-26 deploy session)

### Bug 1 — tsx not found at container startup

**Symptom:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /app/`  
**Root cause:** Dockerfile used `WORKDIR /app` (repo root), but `tsx` is a devDependency of `apps/api`, installed in `apps/api/node_modules/tsx`. `node --import tsx/esm` resolves from CWD, finding nothing at the root.  
**Fix:** Added `WORKDIR /app/apps/api` and changed CMD entry point to `src/index.ts` (relative to new WORKDIR).  
**File:** `apps/api/Dockerfile`

### Bug 2 — OAuth redirect goes to API domain instead of web domain

**Symptom:** After Google sign-in, user is redirected to `https://api-ujian-sekolah.faldi.xyz/dashboard` instead of `https://ujian-sekolah.faldi.xyz/dashboard`.  
**Root cause:** The login page passed `callbackURL: '/dashboard'` (relative) to `signIn.social()`. In a subdomain-split architecture, better-auth on the API server resolves relative `callbackURL` values against its own `baseURL` (`https://api-ujian-sekolah.faldi.xyz`).  
**Fix:** Changed to `callbackURL: \`${window.location.origin}/dashboard\`` — an absolute URL that always points to the web app host regardless of where the API lives.  
**File:** `apps/web/src/routes/index.tsx`

### Bug 3 — chown -R /app exhausts VPS disk

**Symptom:** Docker build fails with `chown: No space left on device` while recursively chowning `node_modules`.  
**Root cause:** `chown -R node:node /app` recurses into tens of thousands of files in `node_modules`, writing metadata changes to the overlay filesystem until the disk fills.  
**Fix:** Changed to `chown node:node /app/uploads` — only the uploads directory needs to be writable by the `node` runtime user; source files are owned by root at build time.  
**File:** `apps/api/Dockerfile`

---

## Deployment Commands

### Redeploy (most common — after `git push`)

```bash
ssh vps-faldi 'cd ~/projects/teacher-exam && \
  git pull && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build'
```

> If only the API changed (no frontend code), rebuild only `api`:
> ```bash
> ... up -d --build api
> ```
> If only the web/frontend changed, rebuild only `web`:
> ```bash
> ... up -d --build web
> ```

### First-time bootstrap (VPS has no clone yet)

```bash
ssh vps-faldi
cd ~/projects
git clone https://github.com/naufaldi/teacher-exam.git
cd teacher-exam

cp .env.production.example .env.production
# Fill in all values — SESSION_SECRET, GOOGLE_*, ANTHROPIC_API_KEY, POSTGRES_* DATABASE_URL
chmod 600 .env.production

# Start DB first
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build db

# Run DB migrations (one-shot profile)
docker compose -f docker-compose.prod.yml --env-file .env.production --profile migrate run --rm migrate

# Start API and web
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api web
```

### Run DB migrations manually (after schema changes)

```bash
ssh vps-faldi 'cd ~/projects/teacher-exam && \
  docker compose -f docker-compose.prod.yml --env-file .env.production --profile migrate run --rm migrate'
```

### Rollback to a previous commit

```bash
ssh vps-faldi
cd ~/projects/teacher-exam
git log --oneline -10
git checkout <sha>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api web
```

---

## Common Ops

```bash
# Container status
ssh vps-faldi 'docker compose -f ~/projects/teacher-exam/docker-compose.prod.yml --env-file ~/projects/teacher-exam/.env.production ps'

# API logs (live)
ssh vps-faldi 'docker logs -f teacher-exam-api-1'

# Caddy logs — cert issues, routing errors
ssh vps-faldi 'docker logs edge-proxy-caddy --tail=50'

# Disk usage
ssh vps-faldi 'df -h / && docker system df'

# Free up Docker build cache (if disk fills)
ssh vps-faldi 'docker image prune -af && docker builder prune -af'

# DB backup
ssh vps-faldi 'docker exec teacher-exam-db-1 pg_dump -U $POSTGRES_USER $POSTGRES_DB > ~/backups/teacher-exam_$(date +%Y%m%d).sql'

# Probe API health internally (bypasses Cloudflare)
ssh vps-faldi 'docker exec teacher-exam-api-1 wget -qO- http://localhost:3001/api/health'
```

---

## Environment Variables Reference

| Variable | Set in | Example value | Notes |
|---|---|---|---|
| `DOMAIN` | `.env.production` | `ujian-sekolah.faldi.xyz` | Web subdomain |
| `API_DOMAIN` | `.env.production` | `api-ujian-sekolah.faldi.xyz` | API subdomain |
| `POSTGRES_USER` | `.env.production` | `school_exam` | |
| `POSTGRES_PASSWORD` | `.env.production` | (secret) | |
| `POSTGRES_DB` | `.env.production` | `school_exam` | |
| `DATABASE_URL` | `.env.production` | `postgresql://user:pass@db:5432/dbname` | `@db` = compose service name |
| `SESSION_SECRET` | `.env.production` | 64-char hex | `openssl rand -hex 32` |
| `APP_URL` | docker-compose (from DOMAIN) | `https://ujian-sekolah.faldi.xyz` | better-auth `trustedOrigins` |
| `BETTER_AUTH_URL` | docker-compose (from API_DOMAIN) | `https://api-ujian-sekolah.faldi.xyz` | better-auth `baseURL` — must be the **API** host |
| `GOOGLE_CLIENT_ID` | `.env.production` | (secret) | |
| `GOOGLE_CLIENT_SECRET` | `.env.production` | (secret) | |
| `ANTHROPIC_API_KEY` | `.env.production` | (secret) | |
| `VITE_API_URL` | docker-compose build arg | `https://api-ujian-sekolah.faldi.xyz/api` | Baked into JS bundle at build time; changes require `--build web` |

---

## Google OAuth Setup

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client:

**Authorized redirect URIs** (both required):
```
http://localhost:3001/api/auth/callback/google     ← local dev
https://api-ujian-sekolah.faldi.xyz/api/auth/callback/google  ← production
```

Note: the redirect URI points to the **API** subdomain, not the web subdomain.

---

## Verification Checklist (run after every deploy)

```bash
# 1. Containers healthy
ssh vps-faldi 'docker compose -f ~/projects/teacher-exam/docker-compose.prod.yml --env-file ~/projects/teacher-exam/.env.production ps'
# Expected: db healthy, api healthy, web up

# 2. API health (public, via Cloudflare)
curl -sf https://api-ujian-sekolah.faldi.xyz/api/health
# Expected: {"status":"ok","service":"teacher-exam-api","timestamp":"..."}

# 3. SPA loads (public, via Cloudflare)
curl -sIL https://ujian-sekolah.faldi.xyz | head -5
# Expected: HTTP/2 200, content-type: text/html

# 4. Vite bundle baked with correct API domain (after web rebuild)
ssh vps-faldi 'docker exec teacher-exam-web-1 sh -c "grep -ro api-ujian-sekolah.faldi.xyz /srv/assets/ | head -1"'
# Expected: /srv/assets/index-*.js:api-ujian-sekolah.faldi.xyz

# 5. Manual: open https://ujian-sekolah.faldi.xyz in browser
#    Sign in with Google → should land on /dashboard (not on the API domain)
#    Check DevTools Network → XHR to api-ujian-sekolah.faldi.xyz should carry cookies
```

---

## Known Limitations / Deferred Work

| Item | Status | Notes |
|---|---|---|
| Automated deploys (GitHub Actions) | Deferred | Manual `git pull + up --build` is the current flow |
| File uploads (PDF pembahasan) | Working | Stored in `uploads_data` named volume; not backed up |
| Database backups | Deferred | Manual `pg_dump` only; no cron |
| Staging environment | Deferred | Single prod only |
| Multi-instance / rolling restart | Deferred | One container per service; fine for current load |
| R2/S3 for uploads | Deferred | Move if uploads volume grows large |

---

## Gotchas for Future AI Agents

1. **Never `chown -R /app`** in the Dockerfile — recurses into `node_modules` and fills disk. Only chown specific writable dirs (`/app/uploads`).

2. **WORKDIR must be `/app/apps/api`** when running `node --import tsx/esm`. pnpm does not hoist `tsx` to the root `node_modules`; it lives only in `apps/api/node_modules`.

3. **`VITE_API_URL` is a build-time arg**, not a runtime env var. Changing the API domain requires `docker compose up --build web`, not just `up -d`.

4. **`callbackURL` in `signIn.social()` must be absolute**. A relative path like `/dashboard` is resolved by better-auth against its own `baseURL` (the API host), not the web host. Use `window.location.origin + '/dashboard'`.

5. **`BETTER_AUTH_URL` ≠ `APP_URL`** in subdomain-split deployments. `BETTER_AUTH_URL` is the API's own public URL (for OAuth callback construction); `APP_URL` is the web app's URL (for CORS/trustedOrigins).

6. **Docker disk on VPS can fill during builds** (49 GB total, fast-fills with node_modules layers). Run `docker image prune -af && docker builder prune -af` before a full rebuild if disk is under 5 GB free.

7. **Caddy docker-proxy reloads on every container event**. In-flight ACME cert requests get cancelled on reload — the `context canceled` errors in Caddy logs during startup are expected and Caddy retries automatically.

8. **The `upstream` (singular) error in Caddy logs** is from another app already on the VPS with an old-style label. It is not a teacher-exam issue and can be ignored.
