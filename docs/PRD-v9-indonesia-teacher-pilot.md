# Product Requirements Document (PRD) v9

## Indonesia Teacher Pilot — Generate Soal

| Field | Value |
|-------|-------|
| **Product Name** | School Exam Generator (Ujian SD) |
| **Version** | 9.0 — Indonesia Teacher Pilot |
| **Date** | 2026-07-23 |
| **Status** | Pilot implementation |
| **Tracking** | [GitHub #239](https://github.com/naufaldi/teacher-exam/issues/239) |
| **Baseline** | [Product Roadmap](ROADMAP.md), [PRD v8](PRD-v8-generate-pdf-enhancement.md) |
| **Primary Flow** | Generate → Review → Preview/Export → Feedback |

---

## 1. Current Product Focus

Release the existing **Generate Soal** flow to a small group of teachers in Indonesia and collect evidence from real classroom preparation work.

This pilot focuses on one question:

> Can an Indonesian teacher independently generate a question sheet they would actually use, after an acceptable amount of review and editing?

Correction depth, student delivery, weakness analysis, and other roadmap milestones do not determine pilot success.

## 2. Target Signal

The primary outcome is captured immediately after a successful PDF/DOCX export or browser print intent:

- **ready** — can be used immediately
- **ready_after_edit** — usable after small corrections
- **not_ready** — cannot yet be used

The system separately records the number of exported sheets so readiness is not reported without a response-rate denominator.

## 3. Feedback Surfaces

### Persistent feedback

Every authenticated page shows a quiet **Beri Masukan** action. It opens the configured Google Form in a new tab without interrupting the teacher’s work.

### Post-export readiness

After successful PDF/DOCX export or print intent, the product asks:

**Apakah lembar ini siap digunakan?**

The response is submitted in one click. The teacher may then open the Google Form to explain further.

Dismissal suppresses the prompt for the current Preview visit. It may return on a later visit until answered.

## 4. Data and Privacy

The pilot stores:

- authenticated teacher ID
- owned exam ID
- first export/print trigger and time
- optional readiness answer and time

It does not store question content, uploaded-file metadata, student information, screenshots, or free text.

The Google Form must not contain a file-upload question in v1. This avoids accidental submission of student data.

## 5. Google Form Contract

URL: [Masukan UjianSD — Generate Soal](https://forms.gle/B4s8x1G2UQM6me7z8)

Required configuration:

- verified email collection
- multiple responses allowed
- response summary hidden
- Indonesian title and copy
- required location: Generate/upload, Review/edit, Preview/export, Other
- required category: question quality, error, usability, feature suggestion
- required explanation
- optional reasons the generated sheet was not ready
- required permission for a 15-minute follow-up
- no file upload

## 6. Reporting

Run:

```bash
pnpm --filter @teacher-exam/api feedback:report
```

The default summary shows:

- exported sheets
- answered sheets and response rate
- readiness percentages
- breakdown by subject, grade, source mode, and first trigger

Controlled follow-up export:

```bash
pnpm --filter @teacher-exam/api feedback:report -- --format=csv
```

CSV is written to stdout and must never be committed.

## 7. Pilot Gate

The default release gate is:

- at least 5 teachers
- at least 10 exported sheets
- at least 70% response rate
- at least 70% `ready + ready_after_edit`
- interview every teacher who selects `not_ready`

These thresholds are an initial decision rule, not proof of statistical significance.

## 8. Rollout and Rollback

Roll out disabled first:

1. deploy the code
2. apply migration `0020_add_exam_pilot_outcomes.sql`
3. update and verify the Google Form
4. set repository build variables:
   - `VITE_TEACHER_FEEDBACK_ENABLED=true`
   - `VITE_FEEDBACK_FORM_URL=https://forms.gle/B4s8x1G2UQM6me7z8`
5. rebuild the web image
6. complete the [browser QA runbook](qa/teacher-feedback-pilot.md)

Rollback by setting `VITE_TEACHER_FEEDBACK_ENABLED=false` and rebuilding the web image. Collected outcome data remains for analysis.

## 9. Scope Boundary

### In scope

- existing Generate → Review → Preview/Export journey
- reliability and quality issues blocking real use
- readiness outcome and fast qualitative feedback
- teacher follow-up based on explicit consent

### Out of scope

- broad public launch
- student-data collection
- free-text feedback stored in the product database
- building later roadmap milestones without pilot evidence
- changing AI-provider configuration or generation limits for feedback collection

## 10. Success Decision

Continue investing in Generate Soal when the pilot gate is met and teacher interviews do not reveal a repeated critical blocker.

Prioritize fixes and repeat the pilot when response or readiness targets miss because of identifiable product problems.

Stop expanding scope when the cohort cannot complete the core journey or does not value the generated output after the critical issues are addressed.
