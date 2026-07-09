# Monetize model eval kit (2026)

Research-only eval: compare model pairs on **PRD → RFC → Code → Review** for a **Free / Pro** monetize case on this repo.

**Do not merge eval result branches into `main`.**

---

## Quick start (human)

1. Work from branch **`eval-ops`** (full kit, including this README + `EVAL-PLAN.md`).
2. Fill [`slot-map.md`](./slot-map.md) with which model sits in A–H.
3. In an **ops** Cursor chat, say: `Start monetize PRD eval.`
4. Ops agent prepares `prd-eval-model-a`. You open a **new** chat on that branch and paste [`prompts/01-prd.md`](./prompts/01-prd.md).
5. Say `PRD A done. Continue to B.` then run Model B the same way.
6. Say `PRD A and B done. Continue.` — agent scores, promotes PRD A, hands RFC prompts.
7. Repeat through Code and Review. Finish with WRITEUP.

Canonical rules: **[`EVAL-PLAN.md`](./EVAL-PLAN.md)** (ops agents must read this first).

Diagram: [`monetize-model-eval.canvas.tsx`](./monetize-model-eval.canvas.tsx) (ops only — strip from generator branches).

---

## One-liners

| Say | Effect |
|-----|--------|
| `Start monetize PRD eval.` | Prep model-a + PRD prompt |
| `PRD A done. Continue to B.` | Commit A, prep model-b |
| `PRD A and B done. Continue.` | Score → promote A → RFC |
| `RFC C and D done. Continue.` | Score → promote A+C → Code |
| `Code E and F done. Continue.` | Score → Review from E |
| `Reviews done. Continue.` | Score → WRITEUP |
| `Where are we?` | Progress checklist |
| `Score PRD only.` | Judge without promote |

---

## Prompt cheat sheet

| Run | Branch | Paste |
|-----|--------|-------|
| PRD A / B | `prd-eval-model-a` / `b` | `prompts/01-prd.md` |
| RFC C / D | `rfc-eval-model-c` / `d` | `prompts/02-rfc.md` |
| Code E / F | `code-eval-model-e` / `f` | `prompts/03-code.md` |
| Review G / H | `review-eval-model-g` / `h` | `prompts/04-review.md` |
| Judge | `eval-ops` | `EVAL-PLAN.md` + `judge/judge-prompt.md` + rubric + X/Y |

---

## Isolation (critical)

Generators see only: `theme-brief.md`, `context-pack.md`, one stage prompt, allowed `baselines/`, allowlisted product files.

Generators must **never** see: `EVAL-PLAN.md`, `rubrics/`, `judge/`, `scores/`, `WRITEUP.md`, rival artifacts.

When creating generator setup branches from `eval-ops`, strip operator-only files. See `EVAL-PLAN.md` §10.

Optional on generator branches: [`GENERATOR.md`](./GENERATOR.md) only.

---

## Folder map

| Path | Visibility |
|------|------------|
| `theme-brief.md`, `context-pack.md`, `prompts/` | Generator |
| `baselines/` | Generator (stage inputs) |
| `EVAL-PLAN.md`, `slot-map.md`, `rubrics/`, `judge/`, `scores/`, `WRITEUP.md` | Ops only |
| `artifacts/` | Written by generators on result branches; copied to ops for judging |

---

## Create `eval-ops` + `prd-eval` (first time)

```bash
git checkout main
git checkout -b eval-ops
# commit this kit if not already
git add docs/evals/monetize-2026
git commit -m "docs(evals): monetize-2026 kit"

git checkout -b prd-eval
# strip operator-only files from the working tree, keep generator subset, commit
# then: git checkout -b prd-eval-model-a
```

Promote commands and full checklist live in `EVAL-PLAN.md`.
