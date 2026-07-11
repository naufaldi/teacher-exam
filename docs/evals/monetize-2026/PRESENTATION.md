# Monetize model eval — presentation slides

Copy into Marp / Slidev / Notion / Google Slides. Each `---` is a slide break.

Source: `docs/evals/monetize-2026/WRITEUP.md` · scores JSON · 2026-07-11

---

# Monetize model eval

**Free / Pro feature gates** on teacher-exam

Research-only · 2026-07-11 · branch `eval-ops`

---

# Method in 30 seconds

- **Theme:** Free / Pro subscription + feature gates
- **Pairs:** PRD A vs B · RFC C vs D · Code E vs F · Review G vs H
- **Scoring:** 5 × (1–10) + essay · blind LLM judge · swap-order
- **Baselines (fixed):** RFC ← PRD **A** · Code ← A + RFC **C** · Review ← Code **E**
- **Not** merged to `main`

---

# Winners at a glance

| Stage | Winner | Score | Model |
|-------|--------|-------|-------|
| PRD | **A** | 44 / 50 | GPT 5.5 |
| RFC | **C** | 46 / 50 | Opus 4.8 |
| Code | **F** | 40 / 50 | Kimi K2.7 |
| Review | **G** | 45 / 50 | Opus 4.8 |

Runner-ups: B 43 · D 40 · E 34 · H 44

---

# Slot map

| Slot | Stage | Model | Total | Role |
|------|-------|-------|-------|------|
| A | PRD | GPT 5.5 | 44 | **Winner** + baseline |
| B | PRD | GLM 5.2 | 43 | |
| C | RFC | Opus 4.8 | 46 | **Winner** + baseline |
| D | RFC | Kimi K2.7 | 40 | |
| E | Code | GPT 5.5 | 34 | Review **baseline** (not winner) |
| F | Code | Kimi K2.7 | 40 | **Winner** |
| G | Review | Opus 4.8 | 45 | **Winner** |
| H | Review | GLM 5.2 | 44 | |

---

# PRD — A vs B

| Dimension | A (GPT 5.5) | B (GLM 5.2) |
|-----------|-------------|-------------|
| Case fit | 9 | 9 |
| Edges | 9 | 9 |
| Pain | 9 | 9 |
| Scope | **8** | 7 |
| Acceptance | 9 | 9 |
| **Total** | **44** | **43** |

**Takeaway:** A tighter MVP scope; B stronger Indonesia payment/seam detail but heavier scope.

**Baseline promoted:** A

---

# RFC — C vs D

Baseline: PRD A

| Dimension | C (Opus 4.8) | D (Kimi K2.7) |
|-----------|--------------|---------------|
| Fidelity | 9 | 8 |
| Arch | **10** | 8 |
| Edges | 9 | 8 |
| Phasing | 9 | 8 |
| Implementable | 9 | 8 |
| **Total** | **46** | **40** |

**Takeaway:** C deep monorepo fit + usage ledger; D capability-matrix / middleware reinterpretation.

**Baseline promoted:** C

---

# Code — E vs F

Baseline: PRD A + RFC C

| Dimension | E (GPT 5.5) | F (Kimi K2.7) |
|-----------|-------------|----------------|
| RFC fit | 6 | **8** |
| Stack | 9 | 9 |
| Correctness | 6 | **8** |
| Edges | 5 | **8** |
| Diff | **8** | 7 |
| **Total** | **34** | **40** |

**Takeaway:** F closer to RFC C reserve/commit; E stronger generate UI entitlement, weaker real quota.

Focused tests: **PASS** both.

**Review baseline:** E (always)

---

# Review — G vs H

Baseline: Code E

| Dimension | G (Opus 4.8) | H (GLM 5.2) |
|-----------|--------------|-------------|
| Bugs | 9 | 9 |
| Severity | 9 | 9 |
| Grounding | **10** | 9 |
| Actionable | 9 | 9 |
| FP control | 8 | 8 |
| **Total** | **45** | **44** |

**Takeaway:** Both agree Code E is solid M1 read model but **not** full MVP enforcement (no usage ledger / PLAN_LIMIT / sourceMode gate).

---

# Cross-stage takeaways

1. **Opus 4.8** strong on RFC + Review (architecture + critique).
2. **GPT 5.5** strong on PRD; Code E polished UI/read model but incomplete vs RFC C.
3. **Kimi K2.7** weaker on RFC prose; stronger on Code fidelity to RFC C.
4. **GLM 5.2** competitive on PRD and Review; close seconds, not stage winners.
5. Fixed baselines (A/C/E) mattered: Review judged incomplete E even though F won Code.

---

# Limitations

- Judge was the ops agent (same family); swap-order used, not a separate vendor judge.
- Full monorepo type-check not archived; focused tests only.
- Transient working-tree route wipes during Code E / Review G — reverted; agent contamination risk.
- Research-only — no merge to `main`.

---

# Appendix — where to look

| Artifact | Path on `eval-ops` |
|----------|-------------------|
| Writeup | `docs/evals/monetize-2026/WRITEUP.md` |
| This deck | `docs/evals/monetize-2026/PRESENTATION.md` |
| Scores | `docs/evals/monetize-2026/scores/{prd,rfc,code,review}.json` |
| Canvas 1 · Overview | `monetize-eval-results.canvas.tsx` |
| Canvas 2 · PRD | `monetize-eval-prd.canvas.tsx` |
| Canvas 3 · RFC | `monetize-eval-rfc.canvas.tsx` |
| Canvas 4 · Code | `monetize-eval-code.canvas.tsx` |
| Canvas 5 · Review | `monetize-eval-review.canvas.tsx` |

| Branch | Tip |
|--------|-----|
| `prd-eval-model-a` | `34d903f` |
| `prd-eval-model-b` | `22393f7` |
| `rfc-eval-model-c` | `48c740a` |
| `rfc-eval-model-d` | `25f3c84` |
| `code-eval-model-e` | `f57b11b` |
| `code-eval-model-f` | `f566914` |
| `review-eval-model-g` | `73a126c` |
| `review-eval-model-h` | `8b2c37e` |
