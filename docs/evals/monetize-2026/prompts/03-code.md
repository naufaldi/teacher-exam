# Prompt — Code (slots E / F)

**Stage:** Code  
**Branches:** `code-eval-model-e` · `code-eval-model-f`  
**Shared baselines:** `baselines/prd-a.md` + `baselines/rfc-c.md`

---

## Your job

Implement the **smallest shippable Free / Pro slice** described by the shared RFC (and constrained by PRD A) as **real commits** on this branch.

## Inputs you may use

1. `docs/evals/monetize-2026/baselines/prd-a.md`
2. `docs/evals/monetize-2026/baselines/rfc-c.md`
3. `docs/evals/monetize-2026/theme-brief.md`
4. `docs/evals/monetize-2026/context-pack.md`
5. This prompt
6. Existing product code as needed to implement the RFC slice (still avoid eval ops files)

## Hard rules

- Follow **RFC C** for the MVP slice only — do not implement the entire future roadmap.
- TDD where the repo expects tests (`__test__/` next to code).
- Effect Schema only; no Zod; follow `AGENTS.md` Effect style.
- No drive-by refactors unrelated to monetize.
- Do **not** read rival code branches, `EVAL-PLAN.md`, rubrics, judge, or scores.
- Do **not** merge to `main`.

## Scope guard

Prefer one vertical slice, for example:

- plan / tier field on user (or equivalent) + one server-side gate + one UI affordance

Stop when the RFC’s MVP acceptance for that slice is met.

## Verification you should run

- Focused tests for new code
- `pnpm type-check` (or package-scoped type-check) — note pass/fail in the commit message body if it fails

## Output

Real file changes in `packages/*`, `apps/api`, and/or `apps/web` as required by the RFC.  
Optionally add `docs/evals/monetize-2026/artifacts/code-e-notes.md` or `code-f-notes.md` listing key files touched and type-check result (slot letter must match your branch).
