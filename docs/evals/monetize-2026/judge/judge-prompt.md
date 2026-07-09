# Blind judge prompt

**Visibility:** operator-only (`eval-ops`)  
**You are scoring**, not generating product docs.

## Setup

1. Read `docs/evals/monetize-2026/EVAL-PLAN.md` (judge protocol).
2. Read the stage rubric: `rubrics/prd.md` | `rfc.md` | `code.md` | `review.md`.
3. You will receive **Candidate X** and **Candidate Y** only — no vendor/model names.
4. For RFC/Code/Review, also receive the **shared baseline** inputs for that stage.
5. For Code, you may receive type-check / test notes as hard evidence.

## Instructions

- Score each candidate on all **5 dimensions (integers 1–10)** + **one essay** each.
- Be consistent: same bar for X and Y.
- Do not prefer longer documents automatically.
- Optional: declare pairwise `winner`: `"X"` | `"Y"` | `"tie"`.
- Output **only** JSON matching `scorecard.template.md` / schema below.

## Swap-order protocol

Run **twice** with X/Y swapped. If `winner` flips, set `"inconclusive": true` in the final merged record and explain in `notes`.

## Output schema

```json
{
  "stage": "prd|rfc|code|review",
  "pass": 1,
  "order": ["X", "Y"],
  "candidates": {
    "X": {
      "scores": { "d1": 0, "d2": 0, "d3": 0, "d4": 0, "d5": 0 },
      "essay": "",
      "total": 0
    },
    "Y": {
      "scores": { "d1": 0, "d2": 0, "d3": 0, "d4": 0, "d5": 0 },
      "essay": "",
      "total": 0
    }
  },
  "winner": "X|Y|tie",
  "notes": ""
}
```

Map `d1`…`d5` to the rubric row order for that stage. `total` = sum of five scores.
