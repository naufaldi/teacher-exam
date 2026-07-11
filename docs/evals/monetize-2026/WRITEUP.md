# WRITEUP — Monetize model eval

**Visibility:** operator-only

## Meta

| Field | Value |
|-------|--------|
| Date | 2026-07-11 |
| Theme | Free / Pro feature gates |
| Repo | teacher-exam |
| Slot map | see `slot-map.md` |
| Ops tip | this branch `eval-ops` |

## Progress

- [x] PRD scored
- [x] RFC scored
- [x] Code scored
- [x] Review scored

## Slot map (models)

| Slot | Stage | Model | Winner? |
|------|-------|-------|---------|
| A | PRD | GPT 5.5 | **Yes** (44) |
| B | PRD | GLM 5.2 | No (43) |
| C | RFC | Opus 4.8 | **Yes** (46) |
| D | RFC | Kimi K2.7 | No (40) |
| E | Code | GPT 5.5 | No (34) — **still review baseline** |
| F | Code | Kimi K2.7 | **Yes** (40) |
| G | Review | Opus 4.8 | **Yes** (45) |
| H | Review | GLM 5.2 | No (44) |

## PRD (A vs B)

| Dim | A | B |
|-----|---|---|
| Case fit | 9 | 9 |
| Edges | 9 | 9 |
| Pain | 9 | 9 |
| Scope | **8** | 7 |
| Acceptance | 9 | 9 |
| **Total** | **44** | **43** |

- Pairwise winner (blind): **A** (swap-order consistent)
- Inconclusive? No
- Essay highlights: A tighter MVP scope; B stronger Indonesia payment/seam detail but heavier scope
- **Baseline promoted:** A (always)

## RFC (C vs D) — baseline PRD A

| Dim | C | D |
|-----|---|---|
| Fidelity | 9 | 8 |
| Arch | **10** | 8 |
| Edges | 9 | 8 |
| Phasing | 9 | 8 |
| Implementable | 9 | 8 |
| **Total** | **46** | **40** |

- Winner: **C**
- Essay highlights: C deep monorepo fit + usage ledger; D capability-matrix/middleware reinterpretation
- **Baseline promoted:** C (always)

## Code (E vs F) — baseline PRD A + RFC C

| Dim | E | F |
|-----|---|---|
| RFC fit | 6 | **8** |
| Stack | 9 | 9 |
| Correctness | 6 | **8** |
| Edges | 5 | **8** |
| Diff | **8** | 7 |
| **Total** | **34** | **40** |

- Type-check E / F: not recorded as full turbo run
- Tests E / F: focused PASS both (E entitlement/billing; F billing-services + generate-monetization)
- Winner: **F**
- Essay highlights: F closer to RFC C reserve/commit; E stronger generate UI entitlement surface, weaker real quota
- **Baseline for review:** E (always)

## Review (G vs H) — baseline code E

| Dim | G | H |
|-----|---|---|
| Bugs | 9 | 9 |
| Severity | 9 | 9 |
| Grounding | **10** | 9 |
| Actionable | 9 | 9 |
| FP control | 8 | 8 |
| **Total** | **45** | **44** |

- Winner: **G**
- Both agree: Code E is solid M1 read model but **not** full MVP enforcement (no usage ledger / PLAN_LIMIT / sourceMode gate)

## Cross-stage takeaways

1. **Opus 4.8** strong on RFC + Review (architecture + critique).
2. **GPT 5.5** strong on PRD; Code E polished UI/read model but incomplete vs its own RFC baseline.
3. **Kimi K2.7** weaker on RFC prose architecture, stronger on Code implementation fidelity to RFC C.
4. **GLM 5.2** competitive on PRD and Review; close seconds, not stage winners here.
5. Fixed baselines (A/C/E) mattered: Review judged incomplete E even though F “won” Code — by design.

## Limitations

- Judge was the ops agent (not a separate blind model vendor); swap-order used, but same judge session family.
- Code type-check full monorepo not archived; focused tests only.
- Transient working-tree route wipes appeared during Code E / Review G; reverted and noted — contamination risk for agent workflows.
- Research-only: no merge to `main`.

## Appendix — branch tips

| Branch | Tip (approx) |
|--------|----------------|
| `prd-eval-model-a` | `34d903f` |
| `prd-eval-model-b` | `22393f7` |
| `rfc-eval-model-c` | `48c740a` |
| `rfc-eval-model-d` | `25f3c84` |
| `code-eval-model-e` | `f57b11b` |
| `code-eval-model-f` | `f566914` |
| `review-eval-model-g` | `73a126c` |
| `review-eval-model-h` | `8b2c37e` |
| `eval-ops` | (this commit) |

Score files: `scores/prd.json`, `rfc.json`, `code.json`, `review.json` (+ pass1/pass2).
