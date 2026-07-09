# WRITEUP — Monetize model eval

**Visibility:** operator-only  
Fill after stages complete. Do not put this on generator branches.

## Meta

| Field | Value |
|-------|--------|
| Date | |
| Theme | Free / Pro feature gates |
| Repo | teacher-exam |
| Slot map | see `slot-map.md` |

## Progress

- [ ] PRD scored
- [ ] RFC scored
- [ ] Code scored
- [ ] Review scored

## PRD (A vs B)

| Dim | A | B |
|-----|---|---|
| Case fit | | |
| Edges | | |
| Pain | | |
| Scope | | |
| Acceptance | | |
| **Total** | | |

- Pairwise winner (blind):  
- Inconclusive?  
- Essay highlights:  
- **Baseline promoted:** A (always)

## RFC (C vs D) — baseline PRD A

| Dim | C | D |
|-----|---|---|
| Fidelity | | |
| Arch | | |
| Edges | | |
| Phasing | | |
| Implementable | | |
| **Total** | | |

- Winner:  
- **Baseline promoted:** C (always)

## Code (E vs F) — baseline PRD A + RFC C

| Dim | E | F |
|-----|---|---|
| RFC fit | | |
| Stack | | |
| Correctness | | |
| Edges | | |
| Diff | | |
| **Total** | | |

- Type-check E / F:  
- Tests E / F:  
- Winner:  
- **Baseline for review:** E (always)

## Review (G vs H) — baseline code E

| Dim | G | H |
|-----|---|---|
| Bugs | | |
| Severity | | |
| Grounding | | |
| Actionable | | |
| FP control | | |
| **Total** | | |

- Winner:  

## Cross-stage takeaways

Which slots were strong where? (PRD vs RFC vs Code vs Review)

## Limitations

Contamination? Judge flip? Scope explosion? Missing artifacts?

## Appendix

Links to `scores/*.json` and result branch SHAs:
