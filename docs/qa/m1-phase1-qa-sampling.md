# M1 Phase 1 QA sampling (issue #33)

Target: **50 samples × 4 combos = 200** generations, **≥90% pass** per combo without heavy edit.

## Combos

| Combo | subject | grade |
|-------|---------|-------|
| 1 | `ipas` | 5 |
| 2 | `ipas` | 6 |
| 3 | `bahasa_inggris` | 5 |
| 4 | `bahasa_inggris` | 6 |

## Pass criteria (guru / reviewer)

- Aligned with selected topic and Fase C level
- Clear stem and four plausible options (MCQ)
- **Bahasa Inggris:** stem + options in English; pembahasan may be Indonesian
- No heavy edit required before classroom use

## Automated run (2026-05-26)

```bash
pnpm --filter @teacher-exam/api qa:phase1
```

Report: [`docs/qa/reports/phase1-live-50.md`](reports/phase1-live-50.md) · JSON: [`phase1-live-50.json`](reports/phase1-live-50.json)

Validator: [`apps/api/src/lib/phase1-qa-validator.ts`](../../apps/api/src/lib/phase1-qa-validator.ts)

## Batch results

| Combo | Pass | Fail | Pass % | Notes |
|-------|------|------|--------|-------|
| IPAS K5 | 50 | 0 | 100% | Live AI, 2026-05-26 |
| IPAS K6 | 50 | 0 | 100% | Live AI, 2026-05-26 |
| B.Inggris K5 | 50 | 0 | 100% | Live AI, 2026-05-26 |
| B.Inggris K6 | 50 | 0 | 100% | Live AI, 2026-05-26 |

**Total:** 200/200 pass (100%). All combos exceed the ≥90% (≥45/50) threshold.

## Smoke (dev)

```bash
cd apps/api && node --env-file-if-exists=../../.env --import tsx/esm scripts/qa-phase1-smoke.ts
# or
pnpm --filter @teacher-exam/api qa:phase1 -- --count 5
```

Records JSON under `docs/qa/samples/` (gitignored) for manual spot-check.
