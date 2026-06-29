# M1 browser verification (PRD v3 Phase 1)

Date: 2026-05-26  
Tool: `agent-browser`  
Web: `http://localhost:5173`  
API: `http://localhost:3000`

## Preconditions

- [x] `pnpm dev` — web `:5173`, API `:3000` (`API_PORT` in `.env`, default 3000)
- [x] `pnpm db:migrate` applied on target DB
- [x] Authenticated guru session (dev login)

### Dev login (local QA — no Google OAuth)

Add to root `.env` (see `.env.example`):

```bash
DEV_AUTH_ENABLED=true
DEV_AUTH_EMAIL=dev@guru.local
DEV_AUTH_PASSWORD=change-me-dev-only
VITE_DEV_AUTH=true
API_PORT=3000
APP_URL=http://localhost:5173
```

One-time seed:

```bash
pnpm db:seed:dev
```

Login page shows **Masuk Guru Dev (lokal)** when `VITE_DEV_AUTH=true` and Vite is in dev mode.

After table-unification work (2026-06-29), browser QA should confirm **Pratinjau modal** on Dashboard Riwayat terbaru, `/history`, and `/bank-soal` (not direct `/preview` on eye click).

Headless shortcut (same origin — Vite proxies `/api` to API):

```bash
agent-browser open http://localhost:5173/ \
  && agent-browser eval "fetch('/api/dev/login',{method:'POST',credentials:'include'}).then(r=>r.status)" \
  && agent-browser open http://localhost:5173/dashboard \
  && agent-browser wait --load networkidle \
  && agent-browser snapshot -i
```

`POST /api/dev/login` returns **403** when dev auth is disabled, `NODE_ENV=production`, or `Host` is not localhost.

## Automated smoke (unauthenticated)

| Check | Result |
|-------|--------|
| `GET /` (login) | Pass — Google button visible; dev button hidden without `VITE_DEV_AUTH=true` |
| `GET /bank-soal` | Redirects to login (expected without session) |
| Screenshots | `.agent-browser/dev-login-page.png` (2026-05-19) |

Restart `pnpm dev` after enabling `DEV_AUTH_*` / `VITE_DEV_AUTH` so API and Vite pick up env changes.

## Flow matrix (authenticated — dev login)

| ID | Route | Status | Console | Screenshot |
|----|-------|--------|---------|------------|
| F0 | `/dashboard` | Pass (2026-05-26) | Clean | `f0-dashboard.png` |
| F1 | `/bank-soal` | Pass (2026-05-19) | Clean | `f1-bank-soal.png` |
| F2 | `/generate` IPAS K5 | Pass (2026-05-26) | Clean | `m1-ipas-kelas5.png` |
| F3 | `/generate` IPAS K6 | Pass (2026-05-26) | Clean | `m1-ipas-kelas6.png` |
| F4 | `/generate` B.Inggris K5 | Pass (2026-05-26) | Clean | `m1-bi-kelas5.png` |
| F5 | `/generate` B.Inggris K6 | Pass (2026-05-26) | Clean | `m1-bi-kelas6.png` |
| F6 | Generate → review → preview → cetak | Pass (2026-05-26) | Clean | `m1-f6-ipas-preview.png`, `m1-f6-ipas-cetak.png`, `m1-f6-bi-preview.png`, `m1-f6-bi-cetak.png` |
| F7 | `/history` filters | Pass (2026-05-26) | Clean | `f7-history-filters.png` |
| F8 | `/profile` subjects | Pass (2026-05-26) | Clean | `f8-profile-subjects.png` |

## UX checklist (code review + unit tests)

- [x] Dashboard Generate card mentions four mapel
- [x] Bank Soal card CTA: “Lihat pratinjau” + honest description
- [x] Subject switch clears topics (`setTopiks([])` on mapel change)
- [x] IPAS / BING topics distinct (`generate-topics.test.ts`)
- [x] B.Inggris generated stems in English — verified on live preview (exam `43c2c022…`, 2026-05-26)

## Notes

- Prefer dev login for agent-browser F0–F8; Google OAuth still works when `DEV_AUTH_ENABLED` is unset.
- API-only smoke: after dev login, use `pnpm --filter @teacher-exam/api qa:phase1` (auto dev-login cookie) or copy session into `QA_SESSION_COOKIE` for `qa-phase1-smoke.ts`.
- Vitest: run `pnpm test` in `apps/api` and `apps/web` after dev-auth changes.
