# Slot → model map

**Visibility:** operator-only  
Fill when you assign vendors to slots. Branch identity still wins over this table.

| Slot | Stage | Branch | Artifact | Model (fill in) |
|------|-------|--------|----------|-----------------|
| A | PRD | `prd-eval-model-a` | `artifacts/prd-a.md` | GPT 5.5 |
| B | PRD | `prd-eval-model-b` | `artifacts/prd-b.md` | GLM 5.2|
| C | RFC | `rfc-eval-model-c` | `artifacts/rfc-c.md` | Opus 4.8|
| D | RFC | `rfc-eval-model-d` | `artifacts/rfc-d.md` | Kimi K2.7|
| E | Code | `code-eval-model-e` | commits on branch | GPT 5.5|
| F | Code | `code-eval-model-f` | commits on branch | Kimi K2.7|
| G | Review | `review-eval-model-g` | `artifacts/review-g.md` | Opus 4.8|
| H | Review | `review-eval-model-h` | `artifacts/review-h.md` | GLM 5.2|

**Baselines (fixed, not winners):** A → RFC · A+C → Code · E → Review
