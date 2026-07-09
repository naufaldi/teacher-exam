# Prompt — PRD (slots A / B)

**Stage:** PRD  
**Branches:** `prd-eval-model-a` → write `artifacts/prd-a.md` · `prd-eval-model-b` → write `artifacts/prd-b.md`  
**Visibility:** generator-visible only

---

## Your job

Write a **Product Requirements Document** for adding **Free / Pro monetization with feature gates** to this School Exam Generator (Ujian SD) codebase.

## Inputs you may use

1. `docs/evals/monetize-2026/theme-brief.md`
2. `docs/evals/monetize-2026/context-pack.md` (allowlist — follow it strictly)
3. This prompt

## Hard rules

- Do **not** open `EVAL-PLAN.md`, `rubrics/`, `judge/`, `scores/`, `WRITEUP.md`, or other candidates’ artifacts.
- Do **not** search the repo for “eval”, “rubric”, or scoring instructions.
- Match the tone and structure of existing PRDs (see allowlisted `docs/PRD-v8-*.md` / `PRD-v2-final.md`).
- Stay grounded in this monorepo; no greenfield rewrite.
- Indonesian product context; user-facing strings may be Indonesian.

## Required PRD sections

1. Executive summary + problem / pain
2. Goals and non-goals
3. Free vs Pro matrix (features + limits)
4. User stories (testable)
5. Edge cases (quota exhaustion, plan change, failed payment, abuse, offline/dev auth)
6. Acceptance criteria / Definition of Done for MVP
7. Open questions (short)

## Output

Write a single markdown file:

- On branch `prd-eval-model-a`: `docs/evals/monetize-2026/artifacts/prd-a.md`
- On branch `prd-eval-model-b`: `docs/evals/monetize-2026/artifacts/prd-b.md`

Create the `artifacts/` directory if missing. Do not modify product application code in this stage.
