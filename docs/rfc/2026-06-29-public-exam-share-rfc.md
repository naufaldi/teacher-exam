# RFC: Public Exam Share Page

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Scope** | `/share/:slug`, `GET /api/public/exams/:slug`, `GET /api/public/exams/:slug/export` |

## Summary

Anonymous web page for **guru rekan sejawat** to view and print a shared Final lembar. Not student online exam-taking. Layout parity with authenticated `/preview` (soal + lembar jawaban + kunci + pembahasan).

## Audience

- Primary: fellow teachers who receive a copied link from Riwayat **Bagikan**
- Full package visible: soal, LJ, kunci, pembahasan (when `discussionMd` exists)
- No login required

## Route map

| Layer | Path | Auth |
|-------|------|------|
| Web | `/share/$slug` | None |
| API | `GET /api/public/exams/:slug` | None |
| API | `GET /api/public/exams/:slug/export?format=&variant=` | None |
| API | `POST /api/exams/:id/share` | Owner session (creates slug) |

Slug = `exams.publicShareSlug` (UUID). Set on first share; idempotent on re-share.

## Data contract

- Response: `PublicExamWithQuestionsSchema` — no `userId`
- Gate: `isPublic === true` AND `publishedAt !== null`
- Questions: `status === 'accepted'` only (ordered by `number`)
- Optional: `discussionMd` null → hide pembahasan section

## UI parity matrix

| Surface | Auth | Browse | Print/export |
|---------|------|--------|--------------|
| `SheetPreviewDialog` | Optional | Modal list | Footer → `/preview` |
| `/preview` | Required | Full layout | Scoped print + export |
| `/share/:slug` | None | Full layout | Scoped print + export (parity with preview) |

Shared renderers: `apps/web/src/components/exam-sheet/*` (extracted from preview).

## Print / export

- `data-print-scope`: `all` | `soal` | `lj` | `kunci` | `pembahasan`
- Screen tabs mirror preview (`semua`, `soal`, `lj`, `kunci`, `pembahasan`)
- `@media print`: hide `[data-no-print]`; A4 per US-15
- Export variants: `soal`, `kunci`, `pembahasan` via public export endpoint
- MCQ options: explicit `a.`–`d.` labels (not `<ol type="a">` — Tailwind resets list markers)

## Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Invalid slug / not public / no `publishedAt` | API 404; UI: "Lembar tidak ditemukan atau tidak lagi publik"; CTA `/` |
| E2 | Exam deleted after share | 404 same as E1 |
| E3 | `discussionMd=null` | Hide pembahasan section + export |
| E4 | Mixed question types | Correct renderer; mcq_multi kunci "A, C" |
| E5 | Matematika LaTeX | KaTeX; no raw `$` (QA c8) |
| E6 | Figure questions | SVG in page + export PDF |
| E7 | Empty `instructions` | Omit petunjuk |
| E8 | Null school/year metadata | Placeholder blanks in KOP |
| E9 | Non-final public | API must not return |
| E10 | Rejected/draft questions | Excluded from API |
| E11 | Print soal only | Hide LJ, kunci, pembahasan |
| E12 | 50 soal | Page breaks; LJ may span pages |
| E13 | Re-share | Same slug; `publishedAt` preserved |
| E14 | Clipboard blocked on Bagikan | Toast error (owner flow) |
| E15 | Cross-origin prod | Public GET without cookies |

## Security

- Slug is unguessable UUID
- No owner PII in public payload
- 404 for private/deleted (no existence leak)

## Out of scope

- Student online exam
- Unshare / revoke UI
- Rate limiting (bank E5/E17)
- Changes to Bank Publik modal

## Related

- PRD v2: US-17, US-SHARE-1/2/3
- [RFC unified SheetTable](2026-06-29-unified-sheet-table-rfc.md)
- [Bank Soal core design](../superpowers/specs/2026-05-27-bank-soal-core-design.md)
- [QA c8 Matematika LaTeX](../qa/c8-matematika-latex.md)
