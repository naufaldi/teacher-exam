# Curriculum Corpus

Real Buku Siswa (Kurikulum Merdeka) extracted into structured markdown
that grounds every `/api/ai/generate` call in actual textbook content rather
than the model's general knowledge.

```
curriculum/
├── manifest.ts   ← subject×grade readiness (single source of truth)
├── readiness.ts  ← isGeneratable / listExtractableBooks helpers
├── pdf/          ← inputs (gitignored — too large; re-download from SIBI)
└── md/           ← committed extracted markdown (consumed at runtime)
```

## Source manifest

Every subject×grade combination is declared in `manifest.ts` with a
`status` gate. Helpers in `readiness.ts` answer:

- **`getManifestEntry(subjectKey, grade)`** — lookup one row
- **`isGeneratable(status)`** — `ready` → allowed for generation
- **`listExtractableBooks()`** — `sibi_pdf` + `ready` only (drives `curriculum:extract`)

Shared schemas live in `@teacher-exam/shared` (`CurriculumSourceManifestItem`,
`phaseForGrade`, `CURRICULUM_VERSION`).

### Status meanings

| Status | Meaning | Generate allowed? | Extract allowed? |
|--------|---------|-------------------|------------------|
| `ready` | md + PDF corpus committed | yes | yes |
| `stubbed` | hand-authored / CP-only md | no | no |
| `missing` | no corpus yet | no | no |
| `disabled` | policy-blocked (e.g. IPAS K1–2) | no | no |

### Add a subject-grade

1. Add a row to `manifest.ts` with `status: "missing"`.
2. Download the SIBI PDF → `pdf/{sourceFilename}` (exact filename from manifest).
3. Run extraction: `pnpm --filter @teacher-exam/api curriculum:extract -- --book {slug}`  
   (`slug` = `{subject-slug}-kelas-{grade}`, e.g. `ipas-kelas-5`).
4. Ensure `__test__/curriculum-output.test.ts` passes (add `expectedMinBab` if new).
5. Flip manifest `status` to `ready`.

See [RFC §10 — Curriculum Source Strategy](../../../docs/superpowers/specs/2026-06-11-ujian-sd-all-mapel-kelas-1-6-rfc.md) for the full manifest field spec.

## Source PDFs

Download the latest editions from the official SIBI catalog
([buku.kemendikdasmen.go.id](https://buku.kemendikdasmen.go.id/)) and place
them in `pdf/` with these exact filenames:

| File | Subject × Grade | Approx. size |
|------|-----------------|--------------|
| `Indonesia_BS_KLS_V_Rev.pdf` | Bahasa Indonesia — Kelas 5 | 8.6 MB |
| `Indonesia_BS_KLS_VI_Rev.pdf` | Bahasa Indonesia — Kelas 6 | ~15 MB |
| `Pendidikan-Pancasila-BS-KLS-V.pdf` | Pendidikan Pancasila — Kelas 5 | 7.9 MB |
| `Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf` | Pendidikan Pancasila — Kelas 6 | 12.8 MB |
| `IPAS_BS_KLS_V_Rev.pdf` | IPAS — Kelas 5 | ~7 MB |
| `IPAS_BS_KLS_VI_Rev.pdf` | IPAS — Kelas 6 | ~7 MB |
| `Inggris_FN_BS_KLS_V.pdf` | Bahasa Inggris — Kelas 5 | ~6 MB |
| `Inggris_FN_BS_KLS_VI.pdf` | Bahasa Inggris — Kelas 6 | ~6 MB |

**Matematika (M2):** `matematika-kelas-5.md` and `matematika-kelas-6.md` now
come from SIBI PDF extraction. Manifest marks them `ready` / `sibi_pdf`, so
they are selectable in Generate and included in the extractable book list.

PDFs are CC-licensed by Kemendikdasmen but committed-out because GitHub blocks
files >100 MB and we want clean clones.

## Re-extracting

```bash
# All current extractable books marked ready in the manifest
pnpm --filter @teacher-exam/api curriculum:extract

# Just one (slug = "{subject}-kelas-{grade}")
pnpm --filter @teacher-exam/api curriculum:extract -- --book ipas-kelas-5
```

Requires `ANTHROPIC_API_KEY` in the root `.env`. Wall-clock ~5–10 minutes per
book; full run ~40–80 minutes.

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

Matematika stub files use `## Lingkup Materi Non-Diagram` with `###` sections
instead of `## Bab N:` — validated separately in `curriculum.test.ts`.
