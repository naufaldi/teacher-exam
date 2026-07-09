# Prompt — Review (slots G / H)

**Stage:** Review  
**Branches:** `review-eval-model-g` → `artifacts/review-g.md` · `review-eval-model-h` → `artifacts/review-h.md`  
**Shared baselines:** PRD A + RFC C + **code on this branch** (based on Model E)

---

## Your job

Perform a **code review** of the monetize implementation on this branch against the shared PRD and RFC. Produce a review document — do **not** rewrite the feature.

## Inputs you may use

1. `docs/evals/monetize-2026/baselines/prd-a.md`
2. `docs/evals/monetize-2026/baselines/rfc-c.md`
3. `docs/evals/monetize-2026/baselines/code-e-notes.md` (if present)
4. The **git diff / monetize-related files** on this branch (implementation under review)
5. `theme-brief.md` + `context-pack.md` as needed
6. This prompt

## Hard rules

- Review **this** codebase state (Model E baseline). Do not invent a parallel implementation.
- Do **not** open `EVAL-PLAN.md`, rubrics, judge prompts, scores, or rival reviews.
- Prefer real defects over style nits; calibrate severity.
- Tie findings to PRD/RFC when possible.
- Suggest concrete fixes; do not implement large rewrites unless a one-line typo fix is trivial and you clearly mark it (default: review-only).

## Required review sections

1. Summary (ship / fix-first / blocked)
2. Findings table: id, severity (P0/P1/P2), location, issue, suggested fix
3. Spec gaps (PRD/RFC vs code)
4. Test gaps
5. What looks solid

## Output

- `review-eval-model-g` → `docs/evals/monetize-2026/artifacts/review-g.md`
- `review-eval-model-h` → `docs/evals/monetize-2026/artifacts/review-h.md`
