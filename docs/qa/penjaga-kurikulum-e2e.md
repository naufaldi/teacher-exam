# Penjaga Kurikulum — browser E2E (generate → review)

Date: 2026-05-19  
Tool: `agent-browser`  
Web: `http://localhost:5173`  
API: `http://localhost:3000`  
AI: `AI_PROVIDER=minimax` (sync curriculum validation on generate)

Screenshot: `.agent-browser/penjaga-kurikulum-e2e.png`

## Result

| Step | Status | Notes |
|------|--------|-------|
| Dev login (`POST /api/dev/login`) | Pass | Credentials from `.env`: `DEV_AUTH_EMAIL` / `DEV_AUTH_PASSWORD` |
| `/generate` form fill | Pass | Radix `Select` needed eval workaround (see below) |
| Generate → review redirect | Pass | ~100s to `/review?mode=fast&examId=…` |
| Curriculum badges on all soal | Pass | 18× `curriculum-badge-valid` (Sesuai), 2× `curriculum-badge-needs_review` |
| **Perlu review only** filter | Pass | Checked → 2 visible question cards only |
| Console errors/warnings | Pass | None captured after review load |

## Preconditions

```bash
# .env (see .env.example)
DEV_AUTH_ENABLED=true
DEV_AUTH_EMAIL=dev@guru.local
DEV_AUTH_PASSWORD=change-me-dev-only   # or your local value
VITE_DEV_AUTH=true
AI_PROVIDER=minimax
MINIMAX_API_KEY=…
SESSION_SECRET=…
DATABASE_URL=…
```

```bash
pnpm dev
pnpm db:seed:dev   # one-time; see fixes below if this fails
```

Restart `pnpm dev` after changing `DEV_AUTH_*` / `VITE_DEV_AUTH` so API and Vite pick up env.

## Login (email + password via dev auth)

There is no email/password form on `/`. Local QA uses dev auth:

1. **UI:** **Masuk Guru Dev (lokal)** on `/` when `VITE_DEV_AUTH=true` and Vite was restarted.
2. **Headless:** same-origin `POST /api/dev/login` (server uses `DEV_AUTH_EMAIL` / `DEV_AUTH_PASSWORD` from env — no body required).

```bash
agent-browser open http://localhost:5173/ \
  && agent-browser eval "fetch('/api/dev/login',{method:'POST',credentials:'include'}).then(r=>r.status)" \
  && agent-browser open http://localhost:5173/generate \
  && agent-browser wait --load networkidle
```

Expected: `200` from dev login. `401` before seed → run `pnpm db:seed:dev`.

## Generate flow (agent-browser)

Radix `Select` (Kelas, topik) does not reliably stick with `agent-browser click` / `select`. Use eval:

```javascript
// Example: set Kelas 6, pick first topik, jumlah soal
(() => {
  // trigger Radix selects via native click on trigger + option — or set React state if exposed
  // In practice: click combobox labels from snapshot refs, or drive via keyboard
})();
```

Then click **Generate Lembar** and poll until URL contains `/review` (MiniMax generate + sync validation can take 1–3 minutes for 20 soal).

```bash
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').includes('Generate Lembar')); b?.click(); return !!b; })()"
# poll: agent-browser eval "location.href"
```

## Issues found and fixes

### 1. `pnpm db:seed:dev` failed from repo root

**Symptom:** `Cannot find package 'tsx' imported from /…/teacher-exam/`

**Cause:** Root `package.json` ran `node --import tsx/esm` but `tsx` is only a devDependency of `@teacher-exam/api`.

**Fix:** Delegate to the API package:

- `apps/api/package.json` → `"db:seed:dev": "node --env-file-if-exists=../../.env --import tsx/esm scripts/seed-dev-guru.ts"`
- Root `package.json` → `"db:seed:dev": "pnpm --filter @teacher-exam/api db:seed:dev"`

### 2. Seed script: `username` NOT NULL on sign-up

**Symptom:** `pnpm db:seed:dev` / `signUpEmail` failed with Postgres NOT NULL on `username`.

**Cause:** Standalone `betterAuth` in `seed-dev-guru.ts` did not use `deriveUniqueUsername` hook from production `auth.ts`.

**Fix:** Import `deriveUniqueUsername`, add `databaseHooks.user.create.before`, pass `username: 'guru.dev'` in signup body, enable `username.input: true` on seed auth config. See `apps/api/scripts/seed-dev-guru.ts`.

### 3. Dev login 401 before seed

**Symptom:** `POST /api/dev/login` → 401.

**Cause:** No user row for `DEV_AUTH_EMAIL`.

**Fix:** Run `pnpm db:seed:dev` after enabling `DEV_AUTH_ENABLED=true`.

### 4. **Masuk Guru Dev** button not visible

**Symptom:** Login snapshot shows Google only.

**Cause:** `VITE_DEV_AUTH=true` added without restarting Vite dev server (env baked at startup).

**Fix:** Restart `pnpm dev`. Headless login via `POST /api/dev/login` still works without the button.

### 5. Radix Select automation

**Symptom:** `agent-browser select` / click on Kelas combobox did not persist value; Generate stayed disabled.

**Workaround:** Fill form via `agent-browser eval` (programmatic open/select) or use snapshot refs + keyboard. Not an app bug — automation limitation.

## Review UI checks

After redirect to `/review?mode=fast&examId=…`:

- Heading **Konfirmasi Paket** (fast track).
- Checkbox **Perlu review only** with count (e.g. `2 perlu review`).
- Each soal card: `[data-testid="curriculum-badge-valid"]` or `curriculum-badge-needs_review`.
- Toggle filter → only `needs_review` cards visible.

Optional: **Switch ke Review Detail** for slow-track badge parity (same badges, not re-run in this session).
