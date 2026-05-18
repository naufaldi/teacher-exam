# D6 Diagram Geometry QA Checklist

## Automated Fixture Run

Run 50 fixture samples, including circle figure specs:

```bash
pnpm --filter @teacher-exam/api qa:samples -- --fixture --subject matematika --count 50
```

Expected automated result:
- `docs/qa/reports/matematika-fixture-50.json` is written.
- `failures` is `0`.
- Every included `figure` decodes with `FigureSpecSchema`.
- Review and Preview tests render `[data-figure-svg]` for generated figures.

## Human Review Run

For production-quality sign-off, generate 50 real diagram questions across:
- Bangun Datar
- Bangun Ruang
- Bidang Koordinat

Review criteria:
- The rendered diagram matches the text prompt and answer key.
- Labels, dimensions, and coordinates are readable in Review, Preview, public share, and print.
- Incorrect or missing diagrams can be regenerated.
- Any schema-invalid figure is removed and marked `needs_review`.
- Teacher reviewer confirms diagrams are suitable for class 5/6.

Automated checks prove schema and rendering safety. Human review remains required for visual correctness and teaching quality.
