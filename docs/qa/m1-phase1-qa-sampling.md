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

## Automated smoke (dev)

```bash
# Requires DATABASE_URL, SESSION_SECRET, ANTHROPIC_API_KEY, authenticated API test user
cd apps/api && node --env-file-if-exists=../../.env --import tsx/esm scripts/qa-phase1-smoke.ts
```

Records JSON lines under `docs/qa/samples/` (gitignored) for manual spot-check.

## Batch results (fill per combo)

| Combo | Pass | Fail | Pass % | Notes |
|-------|------|------|--------|-------|
| IPAS K5 | | | | |
| IPAS K6 | | | | |
| B.Inggris K5 | | | | |
| B.Inggris K6 | | | | |
