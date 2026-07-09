# Rubric — Code

Same baselines: PRD A + RFC C. Score **1–10** each dimension + essay.

Also record (not a soft score): `typecheck` pass/fail, focused tests pass/fail.

| # | Dimension | Low (1–3) | Mid (4–7) | High (8–10) |
|---|-----------|-----------|-----------|-------------|
| 1 | RFC fidelity | Unrelated or huge overbuild | Partial slice | Matches agreed RFC MVP slice |
| 2 | Stack fit | Zod / wrong patterns | Mixed | Effect Schema, layers, Drizzle, UI tokens OK |
| 3 | Correctness | Broken / untested | Partial tests | Types + tests; Free vs Pro gate works |
| 4 | Edge handling | None | Some errors | Limit hit, unauthorized, plan mismatch handled |
| 5 | Diff discipline | Huge unrelated churn | Some noise | Minimal, reviewable commits |

**Essay:** Good or bad implementation? Why? (Blind.)
