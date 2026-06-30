# GitHub Issue Index

Canonical mapping between roadmap milestones, RFC epics, GitHub issues, and code signals.
Updated by `scripts/sync-github-progress.mjs` on merged PRs; edit rows here when adding new work.

**Rollup rules (for automation):**

| Milestone key | Rollup |
|---------------|--------|
| M1–M6 | All rows with that milestone `closed` → ROADMAP overview ✅ |
| RFC-E1–E5 | Epic issue `#146`–`#150` child rows |
| Extra | Issues without milestone still tracked; no ROADMAP rollup |

## Milestone overview rollup

| Milestone | Open | Closed | Partial | Rollup status |
|-----------|------|--------|---------|---------------|
| M1 | 0 | 7 | 0 | done |
| M2 | 0 | 8 | 0 | done |
| M3 | 7 | 0 | 0 | not_started |
| M4 | 0 | 8 | 0 | done |
| M5 | 5 | 1 | 4 | in_progress |
| M6 | 7 | 0 | 0 | not_started |
| M7 | 12 | 3 | 0 | in_progress |
| RFC-E1 | 0 | 6 | 0 | done |
| RFC-E2 | 4 | 1 | 1 | in_progress |
| RFC-E3 | 3 | 4 | 0 | in_progress |
| RFC-E4 | 1 | 9 | 0 | in_progress |
| RFC-E5 | 0 | 6 | 0 | done |
| Extra | 1 | 5 | 0 | in_progress |

## Issue rows

| milestone | epic | issue | title | status | code_signal | closed_by |
|-----------|------|-------|-------|--------|-------------|-----------|
| M1 | — | — | M1.1 Extract IPAS K5/K6 corpus | closed | apps/api/src/curriculum/md/*ipas* | — |
| M1 | — | — | M1.2 Extract B. Inggris K5/K6 corpus | closed | apps/api/src/curriculum/md/*inggris* | — |
| M1 | — | — | M1.3 Add ipas/bahasa_inggris DB enum | closed | packages/db/src/migrations | — |
| M1 | — | — | M1.4 Shared schema + UI subjects | closed | apps/web/src/routes/_auth.generate.tsx | — |
| M1 | — | — | M1.5 Topics per subject | closed | apps/api/src/lib/prompt.ts | — |
| M1 | — | — | M1.6 Generate 50 soal QA | closed | docs/qa/ | — |
| M1 | — | — | M1.7 Browser verification | closed | docs/qa/m1-browser-verification.md | — |
| M2 | #87 | — | M2 Matematika LaTeX epic | closed | packages/shared/src/repair-matematika-latex.ts | — |
| M2 | — | — | M2.1 Matematika K5/K6 corpus | closed | apps/api/src/curriculum/md/*matematika* | PR #143 |
| M2 | — | — | M2.2 KaTeX web + PDF | closed | apps/api/src/api/services/export-katex-css.ts | — |
| M2 | — | — | M2.3 AI LaTeX delimiters | closed | apps/api/src/lib/prompt.ts | — |
| M2 | — | — | M2.4 LaTeX validator | closed | packages/shared/src/repair-matematika-latex.ts | — |
| M2 | — | — | M2.5 Hide diagram topics | closed | apps/web/src/routes/_auth.generate.tsx | — |
| M2 | — | — | M2.6 Generate Mtk non-diagram QA | closed | docs/qa/cd-issue-evidence.md | — |
| M2 | — | — | M2.7 Browser verification Mtk | closed | docs/qa/cd-issue-evidence.md | — |
| M3 | — | — | M3.1 figure_spec schema | open | — | — |
| M3 | — | — | M3.2 SVG renderer | open | — | — |
| M3 | — | — | M3.3 AI figure field | open | — | — |
| M3 | — | — | M3.4 Figure validator | open | — | — |
| M3 | — | — | M3.5 Unhide diagram topics | open | — | — |
| M3 | — | — | M3.6 Generate with diagrams QA | open | — | — |
| M3 | — | — | M3.7 Browser verification diagrams | open | — | — |
| M4 | #70 | #70 | E0 PRD v4 Bank Soal tracking epic | closed | apps/web/src/routes/_auth.bank-soal.tsx | PR #196 |
| M4 | #70 | — | M4 per-lembar bank via bankedAt | closed | packages/db/src/migrations/0014_exam_banked_at.sql | PR #196 |
| M4 | #70 | — | M4 bank sheets API | closed | apps/api/src/routes/__test__/bank/bank-sheets.test.ts | PR #196 |
| M4 | #70 | — | M4 Bank Soal UI | closed | apps/web/src/components/bank/bank-sheet-table.tsx | PR #196 |
| M4 | #70 | — | M4 public bank browse | closed | apps/web/src/routes/bank-soal-publik.tsx | — |
| M4 | #70 | #177 | Verify Bank Soal legacy visibility | closed | — | audit 2026-06 superseded |
| M4 | #70 | #178 | Browser verify bank filters | closed | — | audit 2026-06 superseded |
| M4 | #70 | #69 | M4 bank E2E browser verify | closed | docs/qa/m4-bank-e2e.md | — |
| M5 | — | #193 | Student delivery grading analytics | closed | apps/web/src/lib/feature-flags.ts DELIVERY_ENABLED | PR #194 |
| M5 | — | — | M5.0 students table + identity | partial | packages/db/src/migrations/0010_add_classes_students.sql | PR #194 |
| M5 | — | — | M5.1 correction_sessions schema | open | — | — |
| M5 | — | — | M5.2 server-persisted correction | partial | apps/web/src/routes/_auth.correction.$examId.tsx | PR #194 |
| M5 | — | — | M5.3 CSV import | open | — | — |
| M5 | — | — | M5.4 item analysis | partial | apps/web/src/routes/_auth.analytics.tsx | PR #194 |
| M5 | — | — | M5.5 class comparison | open | — | — |
| M5 | — | — | M5.6 export rekap CSV | partial | apps/web/src/routes/_auth.analytics.tsx | PR #194 |
| M5 | — | — | M5.7 historical trends | open | — | — |
| M5 | — | — | M5.8 browser verification | open | — | — |
| M6 | — | — | M6.1 weakness dashboard | open | — | — |
| M6 | — | — | M6.2 question-level insight | open | — | — |
| M6 | — | — | M6.3 topic clustering | open | — | — |
| M6 | — | — | M6.4 AI re-teach suggestions | open | — | — |
| M6 | — | — | M6.5 book reference linking | open | — | — |
| M6 | — | — | M6.6 print report | open | — | — |
| M6 | — | — | M6.7 browser verification | open | — | — |
| RFC-E1 | #146 | #146 | Epic: subject catalog foundation | closed | — | audit 2026-06 superseded |
| RFC-E1 | #146 | #151 | Shared grade/phase/catalog schemas | closed | packages/shared/src/schemas/catalog.ts | PR #179 |
| RFC-E1 | #146 | #152 | DB catalog tables | closed | — | audit 2026-06 superseded |
| RFC-E1 | #146 | #153 | Backfill enum subjects to catalog | closed | — | audit 2026-06 superseded |
| RFC-E1 | #146 | #154 | Legacy enum → catalog mapping | closed | — | audit 2026-06 superseded |
| RFC-E1 | #146 | #155 | Schema decode + migration tests | closed | — | audit 2026-06 superseded |
| RFC-E2 | #147 | #147 | Epic: corpus manifest readiness | open | — | — |
| RFC-E2 | #147 | #156 | K1-6 curriculum source manifest | partial | apps/api/src/curriculum/manifest.ts | — |
| RFC-E2 | #147 | #157 | Extractor reads manifest | closed | apps/api/scripts/extract-curriculum.ts | PR #181 |
| RFC-E2 | #147 | #158 | Validate markdown per source type | open | apps/api/src/curriculum/__test__/curriculum-output.test.ts | — |
| RFC-E2 | #147 | #159 | Readiness tests ready/stubbed/missing | open | apps/api/src/curriculum/__test__/manifest.test.ts | — |
| RFC-E2 | #147 | #160 | Document source acquisition rules | open | apps/api/src/curriculum/README.md | — |
| RFC-E3 | #148 | #148 | Epic: catalog API + generate validation | open | — | — |
| RFC-E3 | #148 | #161 | Curriculum catalog API endpoint | closed | apps/api/src/api/groups/curriculum.ts | PR #182 |
| RFC-E3 | #148 | #162 | Pre-AI subject-grade validation | closed | apps/api/src/lib/ai-generate.ts | PR #182 |
| RFC-E3 | #148 | #163 | Expand grade schema 1-6 | closed | packages/shared/src/schemas/api.ts | PR #187 |
| RFC-E3 | #148 | #164 | Phase-aware prompt blocks | closed | apps/api/src/lib/prompt.ts | PR #187 |
| RFC-E3 | #148 | #165 | Low-grade prompt regression tests | open | apps/api/src/lib/__test__/prompt.test.ts | — |
| RFC-E3 | #148 | #166 | API tests valid/unavailable K1-6 | open | apps/api/src/routes/__test__/curriculum.test.ts | — |
| RFC-E4 | #149 | #149 | Epic: grade-aware Generate form | open | — | — |
| RFC-E4 | #149 | #167 | Kelas 1-6 grade select | closed | apps/web/src/routes/_auth.generate.tsx | PR #187 |
| RFC-E4 | #149 | #168 | Catalog-driven subject/topic options | closed | apps/web/src/lib/curriculum-catalog.ts | — |
| RFC-E4 | #149 | #169 | Reset subject/topic on grade change | closed | apps/web/src/routes/_auth.generate.tsx | — |
| RFC-E4 | #149 | #170 | Phase-aware Generate copy | closed | apps/web/src/routes/_auth.generate.tsx | PR #187 |
| RFC-E4 | #149 | #171 | Unavailable/optional subject states | closed | apps/web/src/lib/curriculum-catalog.ts | — |
| RFC-E4 | #149 | #172 | Generate form tests K1/K4/K6 | closed | apps/web/src/routes/__test__/_auth.generate.test.tsx | — |
| RFC-E4 | #149 | #173 | Browser verify expanded Generate | closed | docs/qa/rfc-e4-generate-browser.md | — |
| RFC-E4 | #149 | #188 | Bab-based materi picker | closed | apps/api/src/curriculum/bab-topics.ts | PR #190 |
| RFC-E4 | #149 | #189 | PRD v7 + RFC Bab picker docs | closed | docs/PRD-v7-bab-materi-picker.md | PR #190 |
| RFC-E5 | #150 | #150 | Epic: dashboard/history/bank compatibility | closed | — | audit 2026-06 superseded |
| RFC-E5 | #150 | #174 | Catalog labels in filters | closed | — | audit 2026-06 superseded |
| RFC-E5 | #150 | #175 | Legacy enum records readable | closed | — | audit 2026-06 superseded |
| RFC-E5 | #150 | #176 | Old K5-6 test fixtures | closed | — | audit 2026-06 superseded |
| RFC-E5 | #150 | #177 | Bank Soal legacy visibility | closed | — | audit 2026-06 superseded |
| RFC-E5 | #150 | #178 | Browser verify filters | closed | — | audit 2026-06 superseded |
| Extra | — | #185 | Audit non-Generate Fase C copy | open | — | — |
| Extra | — | #186 | Derive lower-grade topics from corpus | closed | superseded by #188 | PR #190 |
| Extra | — | #191 | Exam templates/presets | closed | apps/api/src/api/groups/templates.ts | PR #194 |
| Extra | — | #192 | Real PDF/DOCX export | closed | apps/api/src/api/services/export-service.ts | PR #194 |
| Extra | — | #193 | Student delivery + analytics | closed | apps/web/src/routes/_auth.analytics.tsx | PR #194 |
| Extra | — | #183 | Codex security remediation | closed | docs/security/2026-06-24-codex-security-remediation.md | PR #184 |
| M7 | #204 | — | M7 PRD v8 + RFC generate PDF enhancement docs | open | docs/PRD-v8-generate-pdf-enhancement.md | PR #203 |
| M7 | #204 | #216 | M7.F0 corpus v2 richer text | open | apps/api/src/curriculum/md/ | — |
| M7 | #204 | #207 | M7.F1 R2 upload + 3-mode schema + basic generate | open | apps/api/src/lib/pdf-upload-service.ts | PR #203 scaffold |
| M7 | #204 | — | M7.F2 perpustakaan PDF + async ingest | open | apps/api/src/jobs/ingest-worker.ts, apps/web/src/components/generate/pdf-library-picker.tsx | PR #203 scaffold |
| M7 | #204 | #208 | M7.F3 pgvector RAG topic-focused | open | apps/api/src/lib/retrieval/ | PR #203 scaffold |
| M7 | #204 | — | M7.F4 agentic search | open | apps/api/src/lib/retrieval/agentic-search.ts | PR #203 scaffold |
| M7 | #204 | #210 | M7.F5 PDF images + streaming + durable jobs | open | apps/api/src/jobs/generation-worker.ts, apps/api/src/lib/generation-job-service.ts | PR #203 scaffold |
| M7 | #204 | #205 | M7.F1–F5 PR #203 merge blockers | closed | apps/api/src/api/lib/generate-response.ts | PR #203 |
| M7 | #204 | #206 | M7 PR #203 browser verification | closed | docs/qa/ | — |
| M7 | #204 | #209 | M7.F3 corpus chunk index script | open | apps/api/scripts/index-corpus-chunks.ts | — |
| M7 | #204 | #211 | M7.F5 progressive generate-stream | open | apps/api/src/lib/generation-job-service.ts | — |
| M7 | #204 | #212 | M7.F5 async generate hardening | open | apps/api/src/jobs/generation-worker.ts | — |
| M7 | #204 | #213 | M7 hardening upload/ingest | closed | apps/api/src/api/bridge/pdf-upload-route.ts | — |
| M7 | #204 | #214 | M7 integration tests RFC §16 | open | apps/api/src/jobs/__test__/ | — |
| M7 | #204 | #215 | M7 web UX generate polish | open | apps/web/src/routes/_auth.generate.tsx | — |

## Related PRs (recent)

| PR | Closes | Milestone impact |
|----|--------|------------------|
| #203 | #204 (docs epic) | M7 PDF v8 dev scaffold; follow-ups #205–#216 |
| #197 | — | SheetTable + public share (D-3) |
| #196 | #70 | M4 per-lembar Bank Soal |
| #195 | #192 prod PDF | Extra export |
| #194 | #191 #192 #193 | M5 partial + Extra |
| #190 | #188 #189 | RFC-E4 Bab picker |
| #187 | #163 #164 #167 #170 | RFC-E3/E4 generate expansion |
| #182 | #161 (implicit) | RFC-E3 catalog API |
| #181 | corpus K1-K4 | RFC-E2 partial |
| #179 | #151 | RFC-E1 schemas |
