# Product Roadmap 2026–2027

## School Exam Generator (Ujian SD)

| Field | Value |
|-------|-------|
| **Product** | School Exam Generator (Ujian SD) |
| **School Year** | 2026–2027 (Indonesia: Jul 2026 – Jun 2027) |
| **Created** | 2026-04-29 |
| **Strategy** | Ship easy wins first, layer features over the school year |
| **Goal** | Generate → Correct → Understand weaknesses → Re-teach |

---

## Vision

Teachers generate exam questions across all 5 academic subjects, correct student answers, identify what students lack, and get re-teaching suggestions — closing the learning loop.

**Current state:** 2 subjects (BI + PPKN), all core features working in production.
**Target by Nov 2026:** 5 subjects, Bank Soal, deep correction analytics, weakness analysis with re-teach suggestions.

## PRD Alignment

Each milestone maps to a PRD:

| PRD | Status | Milestones |
|-----|--------|------------|
| [PRD v2](PRD-v2-final.md) | ✅ Implemented | Baseline MVP (BI + PPKN, generate, review, preview, correction, history) |
| [PRD v3](PRD-v3-multi-subject.md) | ⬜ Not started | M1, M2, M3 (IPAS, B. Inggris, Matematika) |
| [PRD v4](PRD-v4-bank-soal.md) | ⬜ Not started | M4 (Bank Soal + Exam Builder) |
| [PRD v5](PRD-v5-correction-depth.md) | ⬜ Not started | M5 (Correction Depth) |
| [PRD v6](PRD-v6-weakness-analysis.md) | ⬜ Not started | M6 (Weakness Analysis + Re-teach) |

---

## Milestone Overview

| # | Milestone | Target | PRD | Status |
|---|-----------|--------|-----|--------|
| 1 | IPAS + B. Inggris | May 15, 2026 | [PRD v3](PRD-v3-multi-subject.md) (Phase 1) | ⬜ Not started |
| 2 | Matematika + KaTeX | Jun 15, 2026 | [PRD v3](PRD-v3-multi-subject.md) (Phase 2) | ⬜ Not started |
| 3 | Diagram Geometri | Jul 15, 2026 | [PRD v3](PRD-v3-multi-subject.md) (Phase 3) | ⬜ Not started |
| 4 | Bank Soal + Exam Builder | Aug 31, 2026 | [PRD v4](PRD-v4-bank-soal.md) | ⬜ Not started |
| 5 | Correction Depth | Oct 15, 2026 | [PRD v5](PRD-v5-correction-depth.md) | ⬜ Not started |
| 6 | Weakness Analysis + Re-teach | Nov 30, 2026 | [PRD v6](PRD-v6-weakness-analysis.md) | ⬜ Not started |

---

## Milestone 1: IPAS + B. Inggris

**Target:** May 15, 2026
**Goal:** 4/5 academic subjects available in Generate
**Status:** ⬜ Not started

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 1.1 | Extract IPAS K5/K6 corpus | 2 markdown files in `curriculum/md/`, reviewed by ≥1 guru | File exists, guru sign-off | ⬜ |
| 1.2 | Extract B. Inggris K5/K6 corpus | 2 markdown files, stem+options in English | File exists, guru sign-off | ⬜ |
| 1.3 | Add `ipas`, `bahasa_inggris` to DB enum | Drizzle migration, `pnpm type-check` passes | Migration runs clean | ⬜ |
| 1.4 | Update shared schema + UI option arrays | Generate form shows 4 subjects | Browser verify: form renders | ⬜ |
| 1.5 | Add topics per subject (≥6 each) | Topics array populated in prompt config | `pnpm test` passes | ⬜ |
| 1.6 | Generate 50 soal per subject×grade | ≥90% pass guru review (no heavy edits) | Review sheet signed | ⬜ |
| 1.7 | Browser verification | Generate → preview → cetak → koreksi for IPAS + B.Inggris | No console errors/warnings | ⬜ |

### Done when

Teacher can generate IPAS and B. Inggris exams end-to-end, print, and correct.

### Decisions

_(Record decisions here as they're made)_

### Known Issues

_(Record issues here as they're discovered)_

---

## Milestone 2: Matematika + KaTeX

**Target:** Jun 15, 2026
**Goal:** 5/5 subjects, math notation renders correctly
**Status:** ⬜ Not started

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 2.1 | Extract Matematika K5/K6 corpus | 2 markdown files, reviewed by guru | File exists, guru sign-off | ⬜ |
| 2.2 | Install KaTeX (web + PDF) | `$\frac{3}{4}$` renders in preview and print | Browser screenshot + PDF diff | ⬜ |
| 2.3 | Update AI prompt: LaTeX delimiters required | AI returns `$inline$` and `$$display$$` | 200 sample soal, ≥95% parse | ⬜ |
| 2.4 | Add LaTeX validator | Reject unparseable LaTeX, auto-retry max 2x | Unit test: invalid → retry → fallback | ⬜ |
| 2.5 | Hide diagram topics | Bangun Datar/Ruang/Koordinat not in UI | Browser verify: topic dropdown | ⬜ |
| 2.6 | Generate 50 soal Mtk non-diagram | ≥95% LaTeX renders, ≥90% pass review | Review sheet signed | ⬜ |
| 2.7 | Browser verification | Generate Mtk → preview → PDF cetak clean | No console errors | ⬜ |

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
**Status:** ⬜ Not started

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 3.1 | Define `figure_spec` schema in shared | 6 types: circle, square, rectangle, triangle, trapezoid, coordinate_plane | Schema compiles, tests pass | ⬜ |
| 3.2 | Build deterministic SVG renderer | SVG identical on web and PDF (visual diff <1px) | Screenshot comparison | ⬜ |
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
**Status:** ⬜ Not started

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 4.1 | Design DB schema (bank_questions, bank_shares) | Tables created, migration clean | `pnpm db:migrate` success | ⬜ |
| 4.2 | API: save question to bank | POST endpoint, question stored with metadata | API test passes | ⬜ |
| 4.3 | API: browse bank (filter by subject/grade/topic) | GET endpoint with filters, pagination | API test passes | ⬜ |
| 4.4 | API: public share toggle | Teacher can make bank visible to others | API test passes | ⬜ |
| 4.5 | UI: Bank Soal browse page | New route `/bank-soal`, filter/search work | Browser verify | ⬜ |
| 4.6 | UI: "Save to Bank" action on review/preview | Button saves individual questions | Browser verify | ⬜ |
| 4.7 | UI: Exam Builder from bank | Select questions → assemble new exam → generate | Browser verify | ⬜ |
| 4.8 | Browser verification | Full flow: save → browse → build exam → preview | No console errors | ⬜ |

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
**Status:** ⬜ Not started

### Tasks

| # | Task | Acceptance Criteria | Verification | Status |
|---|------|---------------------|--------------|--------|
| 5.1 | DB schema: correction_sessions, student_answers | Tables created, migration clean | `pnpm db:migrate` success | ⬜ |
| 5.2 | Migrate correction from React state to server | Save/load correction data via API | API test passes | ⬜ |
| 5.3 | Batch import: CSV/spreadsheet upload | Upload CSV → bulk score all students | Browser verify | ⬜ |
| 5.4 | Item analysis: per-question stats | % correct, % wrong per option (distractor) | UI renders correctly | ⬜ |
| 5.5 | Class comparison | Compare scores across classes for same exam | UI renders correctly | ⬜ |
| 5.6 | Export rekap to CSV | Download button works | File downloads, opens in Excel | ⬜ |
| 5.7 | Historical trends | Track student scores across multiple exams | UI renders correctly | ⬜ |
| 5.8 | Browser verification | Full flow: correct → save → analyze → export | No console errors | ⬜ |

### Done when

Teacher corrects exam, saves to DB, sees item analysis, exports to CSV.

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
