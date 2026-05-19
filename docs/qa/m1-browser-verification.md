# M1 browser verification (PRD v3 Phase 1)

Date: 2026-05-19  
Tool: `agent-browser`  
Web: `http://localhost:3000`  
API: `http://localhost:3001`

## Preconditions

- [x] `pnpm dev` — web `:5173`, API `:3001` (set `API_PORT=3001` if `.env` conflicts with port 3000)
- [ ] `pnpm db:migrate` applied on target DB
- [ ] Authenticated guru session (required for F0–F8)

## Automated smoke (unauthenticated)

| Check | Result |
|-------|--------|
| `GET /` (login) | Pass — zero console errors/warnings |
| `GET /bank-soal` | Redirects to login (expected without session) |
| Screenshots | `.agent-browser/f0-login.png`, `f1-bank-soal-unauth.png` |

## Flow matrix (authenticated — run after Google login)

| ID | Route | Status | Console | Screenshot |
|----|-------|--------|---------|------------|
| F0 | `/dashboard` | Pending auth | | `f0-dashboard.png` |
| F1 | `/bank-soal` | Pending auth | | `f1-bank-soal.png` |
| F2 | `/generate` IPAS K5 | Pending auth | | `f2-generate-ipas-k5.png` |
| F3 | `/generate` IPAS K6 | Pending auth | | `f3-generate-ipas-k6.png` |
| F4 | `/generate` B.Inggris K5 | Pending auth | | `f4-generate-bing-k5.png` |
| F5 | `/generate` B.Inggris K6 | Pending auth | | `f5-generate-bing-k6.png` |
| F6 | Generate → review → preview → cetak | Pending auth | | `f6-*.png` |
| F7 | `/history` filters | Pending auth | | `f7-history-filters.png` |
| F8 | `/profile` subjects | Pending auth | | `f8-profile-subjects.png` |

## UX checklist (code review + unit tests)

- [x] Dashboard Generate card mentions four mapel
- [x] Bank Soal card CTA: “Lihat pratinjau” + honest description
- [x] Subject switch clears topics (`setTopiks([])` on mapel change)
- [x] IPAS / BING topics distinct (`generate-topics.test.ts`)
- [ ] B.Inggris generated stems in English — verify in F4–F6 after login

## Notes

- Full matrix requires `agent-browser --session-name teacher-exam` after manual Google login once.
- Vitest: 204 API + 224 web tests passing after Phase 1 changes.
