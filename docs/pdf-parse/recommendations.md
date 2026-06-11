# PDF Handling Recommendations

Research appendix informed by [Pasal.id](./pasal-reference.md) and our [current state](./teacher-exam-current.md).

> **Canonical decisions** (curriculum v2, teacher upload, `pdf-parse`, MCP, images): see [RFC: PDF Handling §3](../rfc/2026-06-10-pdf-handling-rfc.md#3-design-principles).  
> **New mapel operator playbook:** see [RFC §6](../rfc/2026-06-10-pdf-handling-rfc.md#6-new-mapel-playbook).

---

## Adopt from Pasal (Concepts, Not Code)

These are architectural patterns worth learning from. Pasal is Python/Supabase/legal-domain; we adopt the **ideas**, not a direct port.

| Pattern | Pasal implementation | teacher-exam application |
|---------|---------------------|--------------------------|
| **Separate ingest from serve** | Batch pipeline parses PDFs; MCP tools read DB | Curriculum: extract once → commit markdown → runtime reads `.md` only |
| **Parse once, retrieve many** | `EXTRACTION_VERSION` + reprocess without re-download | Curriculum extraction follows this; teacher upload stores bytes once |
| **Job status + hash dedup** | `crawl_jobs.pdf_hash`, skip re-download on match | Useful if we add batch processing or re-extraction for curriculum |
| **Structured storage beats re-sending PDF** | FTS over `document_nodes` | Runtime uses markdown corpus, not PDF bytes |
| **MCP as thin DB reader** | Tools query PostgreSQL, never parse PDFs | Future: expose curriculum chunks via search/get tools |
| **Rate limits + TTL cache on serve layer** | `RateLimiter`, `TTLCache` in MCP server | Apply if we add public API or MCP for corpus access |
| **Append-only revisions** | `apply_revision()` SQL function | Relevant only if crowd-sourced content corrections are ever needed |
| **Extraction versioning** | `EXTRACTION_VERSION` triggers reprocess | Useful when curriculum extraction prompt/schema changes (v1 → v2) |

---

## Do Not Adopt Wholesale

| Pasal component | Why skip for teacher-exam |
|-----------------|--------------------------|
| Python / PyMuPDF pipeline | Our stack is TypeScript + Effect (PyMuPDF OK for **dev-only verify**) |
| `parse_structure.py` (BAB/Pasal/Ayat) | Legal hierarchy ≠ textbook structure (Bab/CP/sub-konsep) |
| Supabase-specific FTS (`search_legal_chunks`) | We use Drizzle + PostgreSQL with different schema |
| Crawler for `peraturan.go.id` | Different data source (SIBI textbooks, teacher uploads) |
| Opus vision verification agent | Overkill for optional 10 MB teacher PDFs |
| AGPL-3.0 code port | Reference only; do not copy source into our repo |

---

## Historical documentation inconsistencies

Resolved in [RFC §11](../rfc/2026-06-10-pdf-handling-rfc.md#11-supersession-table). Summary:

| Source | Old claim | RFC resolution |
|--------|-----------|----------------|
| Foundation RFC §2 | `pdf-parse` for extraction | Offline extract tool; no runtime parse |
| Foundation RFC §6 | Upload extracts text to DB | Store bytes only |
| PRD US-7 | `extracted_text` auto-filled | Deferred; nullable column |
| `package.json` | No `pdf-parse` | Correct for runtime |

---

## Teacher upload checklist (future)

When wiring the scaffold, follow [RFC §8](../rfc/2026-06-10-pdf-handling-rfc.md#8-teacher-upload-flow-b--spec-only). Minimal path:

### Backend

- [ ] `POST /api/pdf-uploads` — multipart, `application/pdf`, ≤10 MB
- [ ] Write file to `UPLOAD_DIR/{id}.pdf`
- [ ] Insert row in `pdf_uploads`; `extracted_text` null; `expiresAt` = now + 7 days
- [ ] `DELETE /api/pdf-uploads/:id` — remove file + row (auth-scoped)
- [ ] In `generateExam()`: load bytes → `AiService.generate({ pdfBytes })`
- [ ] TTL cleanup job for expired uploads

### Frontend

- [ ] Upload on select or generate submit → `pdfUploadId`
- [ ] Pass `pdfUploadId` in `api.ai.generate()`
- [ ] Show uploaded file indicator

### Explicitly skip for MVP

- Local text extraction at generate time
- Populating `extracted_text`
- MCP server
- Chunking teacher PDFs (10 MB fits one document block)

---

## Future MCP (if ever needed)

Only pursue if product requires external AI tools to query teacher-exam data. Follow Pasal's thin-reader pattern — **do not expose raw PDF parsing via MCP.** Pre-index content, expose retrieval tools. See [RFC §9](../rfc/2026-06-10-pdf-handling-rfc.md#9-out-of-scope).

| Pasal | teacher-exam equivalent |
|-------|------------------------|
| `search_laws` | `search_curriculum` — FTS over committed markdown chunks |
| `get_pasal` | `get_bab` — retrieve Bab section by subject/grade/number |
| `list_laws` | `list_subjects` — available corpus files |
