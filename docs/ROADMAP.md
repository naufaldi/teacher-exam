# Product Roadmap 2026–2027

## Ujian Sekolah

| Field | Value |
|-------|-------|
| **Product** | Ujian Sekolah |
| **School Year** | 2026–2027 (Indonesia: Jul 2026 – Jun 2027) |
| **Created** | 2026-04-29 |
| **Strategy** | Ship easy wins first, layer features over the school year |
| **Goal** | Generate → Correct → Understand weaknesses → Re-teach |

---

## Vision

Teachers generate exam questions across all 5 academic subjects, correct student answers, identify what students lack, and get re-teaching suggestions — closing the learning loop.

**Current state:** 5 subjects (BI + PPKN + IPAS + B. Inggris + Matematika), Kelas 1–6 generate (catalog-driven), Bank Soal per lembar, templates, PDF/DOCX export, delivery/analytics behind `DELIVERY_ENABLED`. Koreksi uses real session results when delivery enabled; full PRD v5 depth still pending.
**Target by Nov 2026:** Full correction depth, weakness analysis with re-teach suggestions.

## Decisions

Append-only record of cross-PRD product/technical decisions. Never edit a past decision; supersede with a new one.

| ID | Date | Decision | Supersedes | Rationale |
|----|------|----------|------------|-----------|
| D-1 | 2026-04-29 | Koreksi memperkenalkan tabel `students` (per-teacher, scoped by `user_id` + `class_label` + `subject`). `student_answers.student_id` adalah FK ke `students.id`. Identitas murid dimasukkan via form Nama+Absen sebelum mark jawaban. | PRD v2 §"Privasi murid" baris 763 (koreksi client-side, non-persisten) | Lembar jawaban kertas sudah memuat nama murid; aplikasi hanya mendigitalisasi rekap manual. Tidak ada PII tambahan. Data terisolasi per akun guru. Lihat PRD v5 §2.2 (alur) dan §2.2bis (model data). |
| D-2 | 2026-06-29 | Bank Soal menyimpan **per lembar** (`exams.bankedAt`), bukan per soal (`bank_questions`). Finalize menandai lembar sebagai banked + publik; Pakai lembar menduplikasi seluruh lembar. | PRD v4 per-question bank model | Satu baris = satu lembar ujian (selaras Riwayat). PR #196. |
| D-3 | 2026-06-29 | Tabel lembar disatukan (`SheetTable`) di Dashboard Riwayat terbaru, Riwayat, Bank Saya, Bank Publik. Pratinjau modal untuk browse; `/preview` untuk cetak/export. | — | Konsistensi UI; guru melihat isi soal cepat tanpa meninggalkan halaman. Lihat [RFC 2026-06-29-unified-sheet-table](rfc/2026-06-29-unified-sheet-table-rfc.md). |
| D-4 | 2026-06-29 | Halaman `/share/:slug` = pratinjau anonim penuh (soal + LJ + kunci + pembahasan) untuk guru rekan; renderers dibagi via `exam-sheet`. | — | Link Bagikan dari Riwayat harus printable seperti `/preview`. Lihat [RFC 2026-06-29-public-exam-share](rfc/2026-06-29-public-exam-share-rfc.md). |
| D-5 | 2026-06-29 | Generate enhancement v8: tiga mode materi (`default` / `pdf_guru` / `combine`); default = Buku Siswa; PDF guru + gambar di **Cloudflare R2** (bukan VPS disk); perpustakaan PDF per guru; RAG topik + agentic search; streaming + durable jobs — phased F0–F5. | RFC 2026-06-10 Flow B `UPLOAD_DIR` (guru PDF) | Guru worksheet + combine materi; reuse PDF; selaras PRD v2 intent upload. Lihat [PRD v8](PRD-v8-generate-pdf-enhancement.md) + [RFC 2026-06-29-generate-pdf-enhancement](rfc/2026-06-29-generate-pdf-enhancement-rfc.md). |
| D-6 | 2026-10-11 | The product name is Ujian Sekolah. Milestone 3 is partial. Six geometry figure types have a schema and SVG renderers. Kisi-kisi and kartu soal export exist. | The README and this roadmap named the product Ujian SD, and Milestone 3 was marked not started. | Audit of `main` at `d8e054c`. The full record is the 2026-10-11 Launch readiness history below. |

---

## PRD Alignment

Each milestone maps to a PRD:

| PRD | Status | Milestones |
|-----|--------|------------|
| [PRD v2](PRD-v2-final.md) | ✅ Implemented (koreksi disabled, penjaga kurikulum not built) | Baseline MVP (BI + PPKN + IPAS + B. Inggris, generate, review, preview, pembahasan, history) |
| [PRD v3](PRD-v3-multi-subject.md) | ✅ Phase 1–2 done. M3 diagrams partial (6 shapes) | M1 (IPAS + B. Inggris), M2 (Matematika), M3 (Diagram) |
| [PRD v4](PRD-v4-bank-soal.md) | ✅ Done (revised per-lembar model, D-2) | M4 (Bank Soal) |
| [PRD v5](PRD-v5-correction-depth.md) | 🔄 In progress | M5 (Correction Depth) — delivery loop shipped (#193); persistent koreksi depth pending |
| [PRD v6](PRD-v6-weakness-analysis.md) | ⬜ Not started | M6 (Weakness Analysis + Re-teach) |
| [PRD v8](PRD-v8-generate-pdf-enhancement.md) | 📝 Draft | M7 (Generate PDF Enhancement) — docs only; implementation F0–F5 |

---

## Milestone Overview

| # | Milestone | Target | PRD | Status |
|---|-----------|--------|-----|--------|
| 1 | IPAS + B. Inggris | May 15, 2026 | [PRD v3](PRD-v3-multi-subject.md) (Phase 1) | ✅ Done (2026-05-26) |
| 2 | Matematika + KaTeX | Jun 15, 2026 | [PRD v3](PRD-v3-multi-subject.md) (Phase 2) | ✅ Done (2026-06-23) |
| 3 | Diagram Geometri | Jul 15, 2026 | [PRD v3](PRD-v3-multi-subject.md) (Phase 3) | 🔄 Partial (6 shapes, 2026-10-11) |
| 4 | Bank Soal + Exam Builder | Aug 31, 2026 | [PRD v4](PRD-v4-bank-soal.md) | ✅ Done (revised per-lembar, 2026-06-29) |
| 5 | Correction Depth | Oct 15, 2026 | [PRD v5](PRD-v5-correction-depth.md) | 🔄 In progress |
| 6 | Weakness Analysis + Re-teach | Nov 30, 2026 | [PRD v6](PRD-v6-weakness-analysis.md) | ⬜ Not started |
| 7 | Generate PDF Enhancement | TBD (parallel M3+) | [PRD v8](PRD-v8-generate-pdf-enhancement.md) | 📝 Draft (docs 2026-06-29) |

---

## Milestone 1: IPAS + B. Inggris

**Target:** May 15, 2026
**Goal:** 4/5 academic subjects available in Generate
**Status:** ✅ Done (2026-05-26)

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 1.1 | Extract IPAS K5/K6 corpus | 2 markdown files in `curriculum/md/` | File exists | ✅ |
| 1.2 | Extract B. Inggris K5/K6 corpus | 2 markdown files, stem+options in English | File exists | ✅ |
| 1.3 | Add `ipas`, `bahasa_inggris` to DB enum | Drizzle migration, `pnpm type-check` passes | Migration runs clean | ✅ |
| 1.4 | Update shared schema + UI option arrays | Generate form shows 4 subjects | Browser verify: form renders | ✅ |
| 1.5 | Add topics per subject (≥6 each) | Topics array populated in prompt config | `pnpm test` passes | ✅ |
| 1.6 | Generate 50 soal per subject×grade | ≥90% pass guru review (no heavy edits) | Review sheet signed | ✅ |
| 1.7 | Browser verification | Generate → preview → cetak for IPAS + B.Inggris | No console errors/warnings | ✅ |

### Done when

Teacher can generate IPAS and B. Inggris exams end-to-end and print.

### Decisions

- 2026-04-30: PDFs sourced from SIBI (buku.kemendikdasmen.go.id). Extraction pipeline reused from existing BI/PPKN workflow.
- 2026-04-30: PRD v2 updated to match code (jumlah soal 5-50, 3 question types, composition editor, pembahasan as MVP).
- 2026-04-30: Koreksi stays disabled until PRD v5 (persistent storage + student identity).
- 2026-04-30: Removed leftover migration file `0001_sour_lake.sql` that was causing snapshot collision.

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 2: Matematika + KaTeX

**Target:** Jun 15, 2026
**Goal:** 5/5 subjects, math notation renders correctly
**Status:** ✅ Done (2026-06-23)

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 2.1 | Extract Matematika K5/K6 corpus | 2 markdown files, reviewed by guru | File exists, guru sign-off | ✅ |
| 2.2 | Install KaTeX (web + PDF) | `$\frac{3}{4}$` renders in preview and print | Browser screenshot + PDF diff | ✅ |
| 2.3 | Update AI prompt: LaTeX delimiters required | AI returns `$inline$` and `$$display$$` | 200 sample soal, ≥95% parse | ✅ |
| 2.4 | Add LaTeX validator | Reject unparseable LaTeX, auto-retry max 2x | Unit test: invalid → retry → fallback | ✅ |
| 2.5 | Hide diagram topics | Bangun Datar/Ruang/Koordinat not in UI | Browser verify: topic dropdown | ✅ |
| 2.6 | Generate 50 soal Mtk non-diagram | ≥95% LaTeX renders, ≥90% pass review | Review sheet signed | ✅ |
| 2.7 | Browser verification | Generate Mtk → preview → PDF cetak clean | No console errors | ✅ |

### Done when

Matematika soal with fractions, exponents, roots render correctly in web and PDF.

### Decisions

_(Record decisions here as they're made)_

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 3: Diagram Geometri

**Target:** Jul 15, 2026
**Goal:** Math fully production-ready with geometry figures
**Status:** 🔄 Partial (2026-10-11). Six figure types have a shared schema and SVG renderers. Number line, fraction, clock, bar chart, and answer-key checks are still open.

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 3.1 | Define `figure_spec` schema in shared | 6 types: circle, square, rectangle, triangle, trapezoid, coordinate_plane | Schema compiles, tests pass | ✅ `FigureSpecSchema` decodes the six types |
| 3.2 | Build deterministic SVG renderer | SVG identical on web and PDF (visual diff <1px) | Screenshot comparison | 🔄 Web renderer tests emit stable SVG. Web versus PDF visual diff is not recorded |
| 3.3 | AI outputs `figure` field per soal | JSON with type + parameters | 50 samples, ≥95% valid JSON | ⬜ |
| 3.4 | Validator rejects unsupported figures | Regen with alternative topic succeeds ≥90% | Unit test + 50 samples | ⬜ |
| 3.5 | Unhide diagram topics in UI | Topics appear in dropdown | Browser verify | ⬜ |
| 3.6 | Generate 50 soal with diagrams | ≥95% images match description | Guru review signed | ⬜ |
| 3.7 | Browser verification | "Luas lingkaran" → render web → cetak PDF clean | No console errors | ⬜ |

### Done when

"Luas lingkaran jari-jari 7 cm" shows labeled circle diagram in preview and print.

### Decisions

_(Record decisions here as they're made)_

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 4: Bank Soal + Exam Builder

**Target:** Aug 31, 2026
**Goal:** Teachers save, browse, share, and assemble exams from question bank
**Status:** ✅ Done (revised per-lembar model, D-2)

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 4.1 | DB: `exams.bankedAt` per lembar | Migration 0014/0015, drop `bank_questions` | `pnpm db:migrate` success | ✅ |
| 4.2 | API: bank sheets CRUD + use-sheet | GET/PATCH `/api/bank/sheets`, POST use-sheet | API test passes | ✅ |
| 4.3 | API: browse bank (filter by subject/grade) | Filters + pagination on sheets | API test passes | ✅ |
| 4.4 | API: public share via finalize | `isPublic` + `bankedAt` on finalize | API test passes | ✅ |
| 4.5 | UI: Bank Soal browse page | `/bank-soal` + `/bank-soal-publik` | Browser verify | ✅ |
| 4.6 | UI: auto-save on accept/finalize | No per-question Save to Bank | Browser verify | ✅ |
| 4.7 | UI: Pakai lembar | Duplicate whole lembar to draft exam | Browser verify | ✅ |
| 4.8 | Browser verification | Full flow: finalize → bank → pakai lembar | #178 open | 🔄 |

### Done when

Teacher can save questions to bank, browse others' banks, and build exams from bank.

### Decisions

_(Record decisions here as they're made)_

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 5: Correction Depth

**Target:** Oct 15, 2026
**Goal:** Persistent scoring, batch correction, item analysis
**Status:** 🔄 In progress (delivery loop shipped #193; PRD v5 depth pending)

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 5.0 | Students table + identity capture flow (PRD v5 §2.2 / §2.2bis) | `students` migration applied; form Nama+Absen gates panel jawaban; dedup dialog working; autocomplete from scope; merge dialog on edit-name conflict | Browser verify: form → submit → panel; reload retains; merge resolver works | 🔄 |
| 5.1 | DB schema: correction_sessions, student_answers (with student_id FK) | Tables created, migration clean, cascade constraints verified | `pnpm db:migrate` success | ⬜ |
| 5.2 | Migrate correction from React state to server | Save/load correction data via API, keyed by student_id | API test passes | 🔄 |
| 5.3 | Batch import: CSV/spreadsheet upload | Upload CSV → upsert students (dedup) → bulk score | Browser verify | ⬜ |
| 5.4 | Item analysis: per-question stats | % correct, % wrong per option (distractor) | UI renders correctly | 🔄 |
| 5.5 | Class comparison | Compare scores across classes for same exam | UI renders correctly | ⬜ |
| 5.6 | Export rekap to CSV | Download button works | File downloads, opens in Excel | 🔄 |
| 5.7 | Historical trends | Track student scores across multiple exams, keyed by students.id | UI renders correctly | ⬜ |
| 5.8 | Browser verification | Full flow: capture name → correct → save → analyze → export | No console errors | ⬜ |

### Done when

Teacher captures student name from paper sheet via Nama+Absen form (with autocomplete + dedup), data persists across sessions, item analysis surfaces weak questions, rekap exports to CSV — all keyed off the per-teacher `students` table.

### Decisions

_(Record decisions here as they're made)_

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 6: Weakness Analysis + Re-teach

**Target:** Nov 30, 2026
**Goal:** Auto-identify weak areas, suggest re-teaching topics
**Status:** ⬜ Not started

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 6.1 | Weakness dashboard UI | Visual: which topics students struggle with | Browser verify | ⬜ |
| 6.2 | Question-level insight | "80% answered Q5 wrong (topic: Ide Pokok)" | UI renders correctly | ⬜ |
| 6.3 | Topic clustering | Group weak questions by curriculum topic | Algorithm works | ⬜ |
| 6.4 | AI re-teach suggestions | "Re-teach: Ide Pokok, Gagasan Utama" | AI prompt tested | ⬜ |
| 6.5 | Book reference linking | Link weak topics to specific Buku Siswa chapters | Links work | ⬜ |
| 6.6 | Print report | One-page summary for parents/principal | Print test clean | ⬜ |
| 6.7 | Browser verification | Full flow: correct → analyze → re-teach suggestions | No console errors | ⬜ |

### Done when

After correcting 20 students, teacher sees "80% struggle with Ide Pokok" and gets re-teach suggestions.

### Decisions

_(Record decisions here as they're made)_

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 7: Generate PDF Enhancement

**Target:** TBD (may run parallel to M3 after F0 corpus v2)
**Goal:** Three source modes, teacher PDF library on R2, RAG + agentic retrieval, optional PDF images, durable streaming generate
**Status:** 🔄 In progress — F1–F5 implemented on branch `cursor/cloud-agent-1782726161423-c8rad` (PR #203); R2 prod storage deferred

### Phases (from PRD v8 / RFC)

| Phase | Goal | Status |
|-------|------|--------|
| F0 | Corpus v2 richer text (operator track) | 🔄 Existing RFC-E2 work |
| F1 | R2 upload + 3-mode schema + basic generate | ✅ Done (filesystem dev; PR #203) |
| F2 | Perpustakaan + async ingest | ✅ Done (`ingest_jobs`, library picker, GET/DELETE pdf-uploads) |
| F3 | pgvector RAG topic-focused | ✅ Done (`document_chunks`, `USE_RAG=1`; `real[]` embeddings, no pgvector) |
| F4 | Agentic search | ✅ Done (max 3 steps, retrieval trace) |
| F5 | PDF images + streaming + durable jobs | ✅ Done (`generation_jobs`, `VITE_ASYNC_GENERATE`, `includePdfImages`) |

### Decisions

- 2026-06-29: **D-5** — R2 only for guru PDF/images; default mode Buku Siswa; see Decisions table above.

---

## Success Metrics

Measured per milestone, aligned with the school year cycle:

| Metric | M1 (IPAS/BI) | M2 (Mtk+KaTeX) | M3 (Diagram) | M4 (Bank) | M5 (Correction) | M6 (Weakness) |
|--------|--------------|-----------------|---------------|-----------|------------------|----------------|
| Adoption (% teachers generate ≥1×) | IPAS 40%, BI 25% | Mtk 30% | Mtk diagram 60% | Bank save 20% | Persistent rekap 30% | Dashboard 15% |
| Generate success rate | ≥90% | ≥85% | ≥80% | — | — | — |
| Guru satisfaction (1–5) | ≥4.0 | ≥4.0 | ≥4.2 | ≥4.0 | ≥4.0 | ≥4.2 |
| KaTeX render error rate | n/a | <2% | <3% | — | — | — |
| Export usage | — | — | — | — | CSV 10% | Print 10% |

---

## Dependencies & Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | Buku Siswa PDF not available for IPAS/BI/Mtk | Blocks M1–M3 | Spike sourcing day 1; fallback to CP/ATP hardcoded |
| 2 | KaTeX LaTeX reliability <95% | Blocks M2 | Pilot 200 soal early; adjust DoD if needed |
| 3 | Diagram accuracy <95% | Blocks M3 | Open to 90% threshold after pilot |
| 4 | Correction migration (client→server) breaks existing flow | Blocks M5 | Feature flag: old flow stays until new is verified |
| 5 | Bank Soal moderation (spam/low-quality) | Blocks M4 | Phase 1: no moderation, trust teachers; add later |

---

## Out of Scope (This Roadmap)

Explicitly **not** included:

- Online exam (students taking exams in browser)
- Mobile app (teachers need desktop for printing)
- Multi-language (English UI)
- Kurikulum outside Fase C (TK, SD 1–4, SMP, SMA)
- K13 curriculum support
- Essay / fill-in-the-blank question types
- Auto-grading with OCR (photo of answer sheet)
- Diagram types beyond 6 basic geometry shapes

---

## How to Use This Doc

This is a **living document**. Update it as work progresses:

1. **Status column**: Change ⬜ → 🔄 → ✅ as tasks complete
2. **Decisions section**: Record key decisions with date and rationale
3. **Known Issues section**: Record blockers, bugs, or scope changes
4. **Verification**: Run checks before marking tasks ✅

The source of truth for what's built is always the code. This doc tracks *what we planned* and *what we learned*.

## GitHub progress tracking

Bidirectional sync between GitHub Issues, this roadmap, and the codebase:

| Artifact | Role |
|----------|------|
| [ISSUE_INDEX.md](ISSUE_INDEX.md) | Canonical mapping: milestone ↔ epic ↔ issue ↔ `code_signal` |
| GitHub Issues | Task-level work items; close via `Closes #N` in PRs |
| This ROADMAP | Product narrative; milestone overview auto-patched on merge |

**Workflow:**

1. Add a row to `ISSUE_INDEX.md` when creating an epic or task issue.
2. PRs must include `Closes #N` and milestone key in the PR template Tracking section.
3. On merged PR, `.github/workflows/sync-progress.yml` runs `scripts/sync-github-progress.mjs` to refresh the index and milestone overview table.
4. Manual full resync: `node scripts/sync-github-progress.mjs` or workflow_dispatch.
5. Audit open issues vs code: `node scripts/sync-github-progress.mjs --verify`.

## History

### 2026-10-11 Launch readiness

This entry records a read-only audit of `main` at `d8e054c`, the merge of #257, taken on 11 Oct 2026 at 15:30 WIB. The live site is [ujian-sekolah.naufaldi.com](https://ujian-sekolah.naufaldi.com). Payments were outside the audit. There is no `plan.html` in this repository, so this section is the plan record. The audit said that file's section 2.1 described a kelas 5 and 6 landing and a missing kisi-kisi. Both claims are obsolete. The landing says kelas 1 to 6 (#253). Kisi-kisi and kartu soal export shipped in #254.

#### Audit summary

These items are shipped and on the live site. Print-ready A4 soal, lembar jawaban, and kunci export to PDF and DOCX. The question bank stores whole sheets, with history, duplicate, a personal bank, and a public bank. The app title is Ujian Sekolah. A sample sheet is available before login. The landing says kelas 1 to 6. Onboarding is shorter, and the username is optional. Generate opens with 3 choices and "Pengaturan lanjutan". Global Open Graph tags are present. `/og.png` and `/robots.txt` respond. The meta description is present. CI on main is green, and deploy waits on CI. High production dependency advisories are cleared. AI rate limits on regenerate and discussion are stored and keyed per IP.

These items are shipped with a gap. CP and TP questions cover Fase A, Fase B, Fase C, and Matematika. 24 Buku Siswa files are ready. B. Indonesia kelas 4, Pendidikan Pancasila kelas 3, and Bahasa Inggris kelas 1 and 2 have no corpus. IPAS kelas 1 and 2 stay disabled because Fase A does not include IPAS. The custom kop is the school name only, and the fallback text is a blank "SD Negeri ____". There is no logo and no address. Kisi-kisi and kartu soal strings are in the live bundle. A logged-in check of the downloaded files was open at audit time. Per-sheet Open Graph on `/share/*` was waiting on the #257 deploy. The sample sheet covers part of the requested public demo. There is no demo account and no README video.

`packages/shared/src/schemas/figures.ts` defines circle, square, rectangle, triangle, trapezoid, and coordinate_plane. `FigureSpecSchema` tests decode those six types. The web renderer tests emit the same SVG twice for each type. The API renderer is a separate copy, so the two can drift. The prompt allows figures only on geometry bab. Number line, fractions, bar chart, pictogram, clock, bangun ruang, angles, and grid area are missing. The shapes are a fixed size, and the labels are not drawn to scale. Nothing checks that the answer key matches the figure parameters.

These items are not in production. Koreksi cepat and the lembar-jawaban scan stay hidden because `VITE_DELIVERY_ENABLED` is absent from the deploy build. The dashboard shows "Segera hadir". Analytics is built and gated the same way. Excel export and e-Rapor export do not exist. Offline CBT and autosave do not exist. Printed sheets have no "Dibuat dengan Ujian Sekolah" footer. SAS packs are not in the public bank. The audit counted about 8 public sheets. WhatsApp share is absent. The audit measured the live web bundle as one file of 1,351,448 bytes. Responses send no HSTS, CSP, X-Frame-Options, or `X-Content-Type-Options` nosniff header. There is no privacy policy, no delete-account flow, and no Sentry or funnel analytics. Dependabot pull requests #245 to #250 were open. #250 bumps `@effect/ai-openai` across a major version. #238 has been open since 9 Jul 2026.

`docs/ISSUE_INDEX.md` lists Milestone 3 as not started, with no code signal on tasks 3.1 to 3.7. This change does not edit that index. `scripts/sync-github-progress.mjs` rewrites the milestone overview status from the index. A later sync can put "Not started" back in that one cell. The Milestone 3 section in this file is the status set by hand.

#### Launch plan

Ranked work before the late-November SAS window.

1. Fill the corpus holes, or change the kelas 1 to 6 claim so it lists the real coverage. The holes are B. Indonesia kelas 4, Pendidikan Pancasila kelas 3, and Bahasa Inggris kelas 1 and 2.
2. Verify kisi-kisi and kartu soal while logged in. Save a kop with name, address, and logo. Print the footer "Dibuat dengan Ujian Sekolah" on every sheet.
3. Add WhatsApp share, and confirm per-sheet Open Graph on `/share/<slug>` after the #257 deploy.
4. Add number line, fraction, clock, and bar chart as deterministic SVG. Fail generation when the figure parameters and the answer key disagree. Move the web renderer and the API renderer to one shared function.
5. Split the web routes so the first load is not one 1.35 MB chunk. Add security headers. Publish a privacy policy and account deletion. Add Sentry and a funnel that logs AI cost per sheet.

Stimulus pictures are the largest missing feature. A question has no image field, and the export has no picture. Prefer crops from the SIBI Buku Siswa PDFs, plus a teacher upload. Offer a generated image only as an opt-in, in grayscale line art, after the teacher accepts it. Leave that work until after the SAS window if time is short.

PDF materi upload already exists. The limit is 10 MB, and there is no page cap. Cap an upload at 60 pages. When a page has almost no text, tell the teacher that a scan is not supported. Store a page number on each chunk, and show that page on the soal.

Buku Siswa markdown is updated by hand. Index each bab with a content hash, and re-index when the hash changes. Send only the selected bab to the model. Add a CI test that every ready manifest row has a parsable markdown file with at least one bab.

The audit left a logged-in smoke test open. The path is onboarding, then generate, then review, then PDF, DOCX, kisi-kisi, and kartu soal. It also left a delivery-flag choice open. Hide every "Segera hadir" card, or turn koreksi on with autosave. Hold Dependabot #250. Close or rebase #238. Add SAS packs to the public bank, and recruit 20 co-design teachers. This history entry closes the audit item that asked for a README and ROADMAP update.

### 2026-10-12 Pause until 14 Oct

Faldi paused new work because usage is low. This entry is the state at the pause. A thread that already had a pull request open may finish that one pull request under the usual rule, then stop. The rule is tests, CI, a security review, and a live screenshot. No new thread, pull request, or fix starts before 14 Oct.

#### Done and on the live site

#280 (`22ab408`) defaults production AI to OpenAI `gpt-6-luna`. The in-container probe returned provider `openai` and model `gpt-6-luna`. A signed-in generate of kelas 4 Matematika Bab 2 Pecahan, 10 soal, exam `bf87c261-e117-44bb-83f2-885c84f32ac6`, finished in about 40 to 60 seconds with no error. Token usage was not recorded. An unauthenticated generate from the agent environment returned HTTP 401. Production dev login is off.

#283 (`87652ef`) makes image publish wait for the quality job. That deploy succeeded and the site returned 200.

#284 (`34a79e6`) publishes the UU PDP notice at `/privacy` and `/kebijakan-privasi`. The contact email and the retention periods are still marked `[PLACEHOLDER]`.

#287 (`689d454`) upgrades better-auth to 1.7.7. That commit is inside the `34a79e6` deploy. The homepage and API health returned 200. A signed-in Google login was not run.

#281 (`c79cc4f`) changes the landing trust bullet to "5 mapel" and keeps the honest per-subject coverage line. Its own deploy failed because the VPS disk was full. A later fetch of the homepage HTML already contained "5 mapel".

#282 (`2d32524`) adds `og:url`, `og:type` `website`, `og:locale` `id_ID`, and a canonical link on the homepage. Those tags are in the live HTML. A real `/share/<slug>` page and a WhatsApp preview were not captured.

Question bank, classes, online exam, and grading stay partial. `VITE_DELIVERY_ENABLED` stays off.

#### Merged, not confirmed live

#285 (`c32c7cc`) keys regenerate and pembahasan to the signed-in guru, and keys a student lockout to that student. Deploy run 38195113070 was still in progress at the pause.

#286 (`e0b130b`) prints each choice letter once. Deploy run 38194068386 failed with `no space left on device` while registering an image layer. The live landing sample still showed `a. a. kalimat penjelas`.

#288 (`dc40ea6`) fails the deploy smoke when the provider rejects the key. It is merged. A deploy of that commit was not confirmed before the pause.

Deploys after #283 are hitting a full VPS disk. A dangling-image prune on the last successful deploy reclaimed 0 bytes. This environment cannot SSH to the VPS.

#### Open

#289 attaches topic diagrams that match the kunci. It was already open at the pause, so that thread may finish it and then stop.

The Tanggal Ujian save and the first-load CORS failure ("Terjadi kesalahan" on Akun, Riwayat, and a fresh review page) were already being written and had no pull request number at the pause. Each of those threads may finish the one pull request it is already writing, then stop.

#250, the major `@effect/ai-openai` bump, stays held. #245, #246, #247, #248, and #249 stay held. #238 stays open and untouched.

#### Paused

No new thread, pull request, or fix until 14 Oct.

The kelas 5 IPAS walkthrough, and a live check that a Pecahan sheet's diagrams match their kunci, wait on a teacher Google session. Agent desktops stop at "Masuk dengan Google".

A WhatsApp preview of a real shared sheet waits.

The privacy placeholders wait on Faldi for the contact email and the retention periods.

#### Resume order for 14 Oct

1. Free disk on the VPS without removing the images the running containers are using. Then redeploy the merged commits that never went live. #286 is the one confirmed still on the old sample.
2. Confirm #285 and #288 on the live site once a deploy can finish.
3. If #289, the date-save pull request, or the CORS pull request is still open, finish those and no others.
4. If the date save or the CORS fix never opened a pull request, start the date save first, then the CORS fix.
5. With a teacher Google session, check a kelas 4 Pecahan sheet for at least two diagrams that match their kunci, then a kelas 5 IPAS sheet whose soal image prints legibly.
6. Capture a real `/share/<slug>` page and a WhatsApp preview.
7. Replace the privacy placeholders when the real contact and retention values exist.
8. Keep #250, #245 to #249, and #238 held.
