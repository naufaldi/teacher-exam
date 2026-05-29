# M4 Bank Soal — browser E2E (E16)

**Date:** 2026-05-29  
**Branch:** `chore/e-epic-hygiene` (post PR #127 / #128)  
**Covers:** #69 E16

## Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | Dev login via "Masuk Guru Dev" | Dashboard loaded |
| 2 | Open `/generate` (fast track pre-selected) | Generate form ready |
| 3 | Bank already seeded from prior fast-track accepts | Skipped live AI; verified `/bank-soal` shows saved soal |
| 4 | `/bank-soal` → Bank Saya tab | ≥20 soal visible with filters/stats |
| 5 | Select ≥5 checkboxes → Buat Ujian → submit metadata | Builder dialog + draft exam created |
| 6 | `/preview?examId=…` for bank-built draft | Preview Lembar renders, no console errors |
| 7 | Riwayat → Bagikan on final exam | Share/publish action triggered |
| 8 | Logout → `/bank-soal-publik` | Anonymous public bank loads (Masuk link, no auth required) |

## Screenshots

- `.agent-browser/m4-bank-01-login.png`
- `.agent-browser/m4-bank-02-generate.png`
- `.agent-browser/m4-bank-03-review.png` (bank-soal stand-in — pre-seeded bank, no live generate)
- `.agent-browser/m4-bank-04-bank-saya.png`
- `.agent-browser/m4-bank-05-builder.png`
- `.agent-browser/m4-bank-06-preview.png`
- `.agent-browser/m4-bank-07-share.png`
- `.agent-browser/m4-bank-08-public.png`

## Console

Clean — no `error` or `warn` entries captured via `window.__agentLogs` hook during the chain.

## Issues verified

E10 tabs, E11 save (pre-seeded), E12 filters, E14 stats, E15 builder, E17 public route

## Notes

- Step 3 used existing dev-seed + prior fast-track bank entries instead of a new AI generate run (avoids flaky/slow live AI in CI-style verification).
- Bank builder navigates to preview via `examId` query param after successful `POST /api/bank/build-exam`.
