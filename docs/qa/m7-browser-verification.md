# M7 Generate PDF — browser verification (#206)

**Date:** 2026-06-30  
**Branch:** `feat/m7-hardening-browser-verify`  
**Parent epic:** [#204 M7: Generate PDF Enhancement](https://github.com/naufaldi/teacher-exam/issues/204)  
**Covers:** [#206](https://github.com/naufaldi/teacher-exam/issues/206) (post–PR #203 scaffold signoff)

## Environment

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Auth: `DEV_AUTH_ENABLED=true`, `VITE_DEV_AUTH=true`, `POST /api/dev/login`
- PDF ingest: `DEV_INGEST_SYNC=1` (inline ingest for local QA)
- Migrations: `0016_m7_pdf_v8_f1.sql`, `0017_m7_pdf_v8_f2f5.sql` applied via `pnpm db:migrate`

## Flows verified

| Mode | Action | Result |
|------|--------|--------|
| **default** | Open `/generate` → Kelas 5 → Bab picker | Buku Siswa mode; Bab options load (BI Kelas 5 corpus) |
| **pdf_guru** | Select "PDF saya saja" | Upload/library controls + Topik bebas field visible; Kurikulum warning area present |
| **combine** | Select "Buku Siswa + PDF saya" | Bab picker + PDF upload controls both visible |
| **library** | pdf_guru → "Dari perpustakaan" | `sample-worksheet.pdf` listed with **Siap** badge after API upload |

### Library polling note

With `DEV_INGEST_SYNC=1`, uploads transition to `ready` synchronously (no long-lived `processing` state in this run). The 2s library poll interval is implemented in `_auth.generate.tsx` and activates when any item has `processing` or `uploaded` status. This pass verified library list fetch and ready-state display after upload.

## Screenshots

| File | Flow |
|------|------|
| `.agent-browser/m7-default-bab-picker.png` | default mode — Kelas 5 + Bab picker |
| `.agent-browser/m7-pdf-guru.png` | pdf_guru mode — upload + topik bebas |
| `.agent-browser/m7-combine.png` | combine mode — Bab + PDF controls |
| `.agent-browser/m7-library-polling.png` | library tab — ready PDF row |

## Console

`window.__agentLogs` hook installed; **zero `error` or `warn`** during `/generate` flows.

## Commands run

```bash
pnpm db:migrate
DEV_INGEST_SYNC=1 pnpm dev
pnpm --filter @teacher-exam/api exec vitest run \
  src/routes/__test__/pdf-uploads/pdf-uploads.post.test.ts \
  src/lib/__test__/pdf-upload-service.test.ts
```

## Related

- PR #203 — M7 F1–F5 dev scaffold
- #213 — PDF magic-byte + storage delete (same delivery branch)
