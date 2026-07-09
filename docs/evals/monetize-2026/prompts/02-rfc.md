# Prompt — RFC (slots C / D)

**Stage:** RFC  
**Branches:** `rfc-eval-model-c` → `artifacts/rfc-c.md` · `rfc-eval-model-d` → `artifacts/rfc-d.md`  
**Shared baseline:** `docs/evals/monetize-2026/baselines/prd-a.md` (always Model A’s PRD — do not replace it)

---

## Your job

Write an **RFC** that turns the baseline PRD into an implementable architecture for this monorepo.

## Inputs you may use

1. `docs/evals/monetize-2026/baselines/prd-a.md` (**required**)
2. `docs/evals/monetize-2026/theme-brief.md`
3. `docs/evals/monetize-2026/context-pack.md` (allowlist)
4. This prompt
5. Allowlisted RFC examples for style only

## Hard rules

- Implement **PRD A as written** — no silent scope creep; call out conflicts as open questions.
- Do **not** read `prd-b`, other RFCs from rivals, `EVAL-PLAN.md`, rubrics, judge, or scores.
- Fit Effect Schema, Drizzle, API layers, and existing web routes.
- Prefer phased delivery; mark MVP vs later.
- Payment provider may be a stubbed boundary if the PRD allows.

## Required RFC sections

1. Overview + relationship to PRD A
2. Goals / non-goals
3. Data model / schema changes
4. API / service boundaries
5. Web UX touchpoints
6. Edge cases + failure modes
7. Phasing / migration
8. Test plan sketch
9. Open questions

## Output

- `rfc-eval-model-c` → `docs/evals/monetize-2026/artifacts/rfc-c.md`
- `rfc-eval-model-d` → `docs/evals/monetize-2026/artifacts/rfc-d.md`

Do not implement application code in this stage.
