# Curriculum Corpus

Real Buku Siswa (Kurikulum Merdeka, Fase C) extracted into structured markdown
that grounds every `/api/ai/generate` call in actual textbook content rather
than the model's general knowledge.

> **Canonical PDF spec:** [RFC: PDF Handling](../../../../docs/rfc/2026-06-10-pdf-handling-rfc.md)

```
curriculum/
├── pdf/   ← Buku Siswa PDF inputs (committed; CC-licensed Kemendikdasmen)
└── md/    ← committed extracted markdown (consumed at runtime)
```

---

## Operator quickstart

1. Download PDF from [buku.kemendikdasmen.go.id](https://buku.kemendikdasmen.go.id/) → place in `pdf/` with exact filename from table below.
2. Register book in `BOOKS` (`scripts/extract-curriculum.ts`) if new mapel — see [RFC §6](../../../../docs/rfc/2026-06-10-pdf-handling-rfc.md#6-new-mapel-playbook).
3. Extract:

```bash
# All registered books
pnpm --filter @teacher-exam/api curriculum:extract

# Single book (slug = "{subject}-kelas-{grade}")
pnpm --filter @teacher-exam/api curriculum:extract -- --book bahasa-indonesia-kelas-5
```

4. Verify (after `curriculum:verify` is implemented):

```bash
pnpm --filter @teacher-exam/api curriculum:verify -- --book bahasa-indonesia-kelas-5
```

5. Guru spot-check one Bab against PDF → commit `md/{slug}.md` only.

**Prerequisites:** `ANTHROPIC_API_KEY` in repo root `.env` (real key, not placeholder). Wall-clock ~5–10 minutes per book.

---

## Source PDFs — BOOKS manifest

PDFs are CC-licensed by Kemendikdasmen and **committed** in `pdf/` so clones can run `curriculum:extract` without re-downloading from SIBI.

### Registered (8 books)

| Slug | Mapel | Kelas | PDF filename |
|------|-------|-------|--------------|
| `bahasa-indonesia-kelas-5` | Bahasa Indonesia | 5 | `Indonesia_BS_KLS_V_Rev.pdf` |
| `bahasa-indonesia-kelas-6` | Bahasa Indonesia | 6 | `Bahasa-Indonesia-BS-KLS-VI_compressed.pdf` |
| `pendidikan-pancasila-kelas-5` | Pendidikan Pancasila | 5 | `Pendidikan-Pancasila-BS-KLS-V.pdf` |
| `pendidikan-pancasila-kelas-6` | Pendidikan Pancasila | 6 | `Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf` |
| `ipas-kelas-5` | IPAS | 5 | `IPAS_BS_KLS_V_Rev.pdf` |
| `ipas-kelas-6` | IPAS | 6 | `IPAS_BS_KLS_VI_Rev.pdf` |
| `bahasa-inggris-kelas-5` | Bahasa Inggris | 5 | `Inggris_FN_BS_KLS_V.pdf` |
| `bahasa-inggris-kelas-6` | Bahasa Inggris | 6 | `Inggris_FN_BS_KLS_VI.pdf` |

### Pending (local PDF, not in BOOKS yet)

| Target slug | PDF filename | Notes |
|-------------|--------------|-------|
| `matematika-kelas-5` | `KKA_BS_KLS_5.pdf` | `matematika` enum + `SUBJECT_SLUG` wired |
| `matematika-kelas-6` | `Matematika_BS_KLS_VI.pdf` | Roadmap M2 — KaTeX before full rollout |

---

## Anthropic document-block limits (cheatsheet)

- **Hard cap:** 100 pages or 32 MB per `document` content block (base64).
- **Our soft cap:** 60 pages / 25 MB per chunk for headroom over compression
  variance + prompt tokens. Consecutive chunks overlap 5 pages so Bab
  boundaries don't get sliced.
- **Merging:** deterministic post-processor (`scripts/lib/merge-bab.ts`)
  dedupes overlap-induced duplicate Bab sections. LLM consolidation is the
  fallback when validation fails.

---

## Output schema — v1 (current) vs v2 (target)

Validated by `scripts/lib/merge-bab.ts` and `__test__/curriculum-output.test.ts`. Full spec: [RFC §4](../../../../docs/rfc/2026-06-10-pdf-handling-rfc.md#4-corpus-schema--v1-current-vs-v2-target).

### v1 (production today)

| Field | Content |
|-------|---------|
| `## Capaian Pembelajaran` | Bullet list |
| `## Bab {n}: {Judul}` | Section header |
| `**Topik utama:**` | Main topic |
| `**Sub-konsep:**` | Bullet list |
| `**Sample teks bacaan:**` | Short quote (2–4 sentences) |
| `**Kosakata kunci:**` | Key vocabulary |
| `**Kompetensi yang diuji:**` | Assessable competencies |

File size: **5–50 KB**.

### v2 (target)

Same structure except:

| Field | Change |
|-------|--------|
| `**Teks bacaan:**` | Replaces `Sample teks bacaan` — **full passage** per Bab (verbatim from PDF) |
| File size cap | **200 KB** |

Images are **not** included — text-only corpus.

Example v2 Bab block:

```md
## Bab 1: Aku Anak Indonesia
**Topik utama:** ...
**Sub-konsep:**
- ...
**Teks bacaan:** |
  Rana dan Rani adalah sepasang saudara kembar...
  (full cerita / informasi from the book)
**Kosakata kunci:** ...
**Kompetensi yang diuji:** ...
```
