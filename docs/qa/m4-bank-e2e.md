# M4 Bank Soal — browser E2E (E16)

**Date:** 2026-05-29  
**Branch:** `chore/e-epic-hygiene`  
**Covers:** [#69 E16](https://github.com/naufaldi/teacher-exam/issues/69)

## Environment

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Auth: dev user (`Guru Dev`) via existing session / `DEV_AUTH_ENABLED`

## Flow verified

| Step | Action | Result |
|------|--------|--------|
| 1 | Open `/dashboard` (authenticated) | Dashboard loads, Guru Dev session active |
| 2 | Navigate `/bank-soal` → Bank Saya tab | 20+ bank questions listed with filters/toolbar |
| 3 | Select 5 questions → **Buat Ujian** | Builder dialog opens |
| 4 | Fill metadata → **Buat ujian** | Redirect to `/preview?examId=…` |
| 5 | Open `/bank-soal-publik` (anonymous) | Public bank page loads without login |

## Screenshots

| File | Step |
|------|------|
| `.agent-browser/m4-bank-01-dashboard.png` | Dashboard (authenticated) |
| `.agent-browser/m4-bank-02-bank-saya.png` | Bank Saya with selection + sticky builder bar |
| `.agent-browser/m4-bank-03-builder.png` | Builder metadata dialog |
| `.agent-browser/m4-bank-04-preview.png` | Preview after build-exam from bank |
| `.agent-browser/m4-bank-05-public.png` | Anonymous public bank route |

## Console

No `error` or `warn` captured during verified steps (`window.__agentLogs` hook).

## Issues exercised

- E10 tabs (`Bank Saya` / `Bank Publik`)
- E12 filter + search + pagination toolbar
- E14 stats banner (visible on Bank Saya)
- E15 exam builder (≥5 selection → metadata → preview)
- E17 public route without auth

## Notes

- Publish-via-Riwayat share and full Generate→Review chain were not re-run in this pass; bank data came from prior dev generates with auto-save.
- Per-card public toggle (E13) superseded by exam-driven publish per [design spec](../superpowers/specs/2026-05-27-bank-soal-core-design.md).
