# C8 Matematika LaTeX QA Checklist

## Automated Fixture Run

Run 50 fixture samples without calling a paid AI provider:

```bash
pnpm --filter @teacher-exam/api qa:samples -- --fixture --subject matematika --count 50
```

Expected automated result:
- `docs/qa/reports/matematika-fixture-50.json` is written.
- `failures` is `0`.
- Every sample passes server-side LaTeX validation.

## Human Review Run

For production-quality sign-off, generate 50 real Matematika non-diagram questions across:
- Bilangan Cacah dan Operasi Hitung
- Pecahan, Desimal, dan Persen
- Pola dan Kalimat Matematika
- Pengukuran
- Data dan Peluang Awal

Review criteria:
- All fractions, exponents, roots, comparisons, and formulas render through KaTeX.
- No raw `$` delimiters appear in Review, Preview, public share (`/share/:slug`), or print. See [RFC 2026-06-29-public-exam-share](../rfc/2026-06-29-public-exam-share-rfc.md).
- Invalid or ambiguous notation is regenerated or marked `needs_review`.
- Teacher reviewer signs off that notation is age-appropriate for class 5/6.

Human review remains required for mathematical correctness and pedagogy; the fixture run only proves parser/rendering safety.
