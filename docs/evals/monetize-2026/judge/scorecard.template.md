# Scorecard template

Save filled results as `scores/<stage>.json` on `eval-ops`.

After both blind passes, also write a **merged** file that maps X/Y back to slots using the anonymization log (never show model names inside the blind judge chat).

## Per-pass JSON

```json
{
  "stage": "prd",
  "pass": 1,
  "order": ["X", "Y"],
  "anonymization": {
    "X": "slot-unknown-during-blind",
    "Y": "slot-unknown-during-blind"
  },
  "candidates": {
    "X": {
      "scores": { "d1": 7, "d2": 6, "d3": 8, "d4": 7, "d5": 6 },
      "essay": "…",
      "total": 34
    },
    "Y": {
      "scores": { "d1": 8, "d2": 7, "d3": 7, "d4": 8, "d5": 7 },
      "essay": "…",
      "total": 37
    }
  },
  "winner": "Y",
  "hardEvidence": {
    "typecheck": null,
    "tests": null
  },
  "notes": ""
}
```

## Merged ops record (after unblinding)

```json
{
  "stage": "prd",
  "slots": {
    "A": { "branch": "prd-eval-model-a", "path": "artifacts/prd-a.md", "model": "<fill>" },
    "B": { "branch": "prd-eval-model-b", "path": "artifacts/prd-b.md", "model": "<fill>" }
  },
  "blindPasses": ["scores/prd.pass1.json", "scores/prd.pass2.json"],
  "inconclusive": false,
  "winnerSlot": "B",
  "baselineForNextStage": "A",
  "dimensionMeans": {
    "A": { "d1": 0, "d2": 0, "d3": 0, "d4": 0, "d5": 0, "total": 0 },
    "B": { "d1": 0, "d2": 0, "d3": 0, "d4": 0, "d5": 0, "total": 0 }
  },
  "essays": { "A": "", "B": "" },
  "notes": "Winner does not change baseline; always promote A/C/E."
}
```

## Dimension name map

| Stage | d1 | d2 | d3 | d4 | d5 |
|-------|----|----|----|----|-----|
| prd | case study fit | edge cases | pain clarity | scope realism | acceptance clarity |
| rfc | spec fidelity | architecture fit | edge cases | phasing | implementability |
| code | RFC fidelity | stack fit | correctness | edge handling | diff discipline |
| review | bug finding | severity calibration | spec grounding | actionability | false-positive control |
