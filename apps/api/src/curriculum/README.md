# Curriculum Corpus

Real Buku Siswa (Kurikulum Merdeka, Fase C) extracted into structured markdown
that grounds every `/api/ai/generate` call in actual textbook content rather
than the model's general knowledge.

```
curriculum/
├── pdf/   ← inputs (gitignored — too large; re-download from SIBI)
└── md/    ← committed extracted markdown (consumed at runtime)
```

## Source PDFs

Download the latest editions from the official SIBI catalog
([buku.kemendikdasmen.go.id](https://buku.kemendikdasmen.go.id/)) and place
them in `pdf/` with these exact filenames:

| File | Subject × Grade | Approx. size |
|------|-----------------|--------------|
| `Indonesia_BS_KLS_V_Rev.pdf` | Bahasa Indonesia — Kelas 5 | 8.6 MB |
| `Bahasa-Indonesia-BS-KLS-VI.pdf` | Bahasa Indonesia — Kelas 6 | 103 MB |
| `Pendidikan-Pancasila-BS-KLS-V.pdf` | Pendidikan Pancasila — Kelas 5 | 7.9 MB |
| `Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf` | Pendidikan Pancasila — Kelas 6 | 12.8 MB |

PDFs are CC-licensed by Kemendikdasmen but committed-out because GitHub blocks
files >100 MB and we want clean clones.

## Re-extracting

```bash
# All four books
pnpm --filter @teacher-exam/api curriculum:extract

# Just one (slug = "{subject}-kelas-{grade}")
pnpm --filter @teacher-exam/api curriculum:extract -- --book bahasa-indonesia-kelas-6
```

Requires `ANTHROPIC_API_KEY` in the root `.env`. Wall-clock ~5–10 minutes.

## Anthropic document-block limits (cheatsheet)

- **Hard cap:** 100 pages or 32 MB per `document` content block (base64).
- **Our soft cap:** 60 pages / 25 MB per chunk for headroom over compression
  variance + prompt tokens. Consecutive chunks overlap 5 pages so Bab
  boundaries don't get sliced.
- **Merging:** deterministic post-processor (`scripts/lib/merge-bab.ts`)
  dedupes overlap-induced duplicate Bab sections. LLM consolidation is the
  fallback when validation fails.

## Output schema

Every generated `md/{slug}-kelas-{n}.md` follows a fixed schema enforced by
`scripts/extract-curriculum.ts` and re-validated in
`__test__/curriculum-output.test.ts`:

```md
# {Mata Pelajaran} — Kelas {N} (Fase C, Kurikulum Merdeka)

## Capaian Pembelajaran
- ...

## Bab {n}: {Judul}
**Topik utama:** ...
**Sub-konsep:**
- ...
**Sample teks bacaan:** "..."
**Kosakata kunci:** ...
**Kompetensi yang diuji:** ...
```
