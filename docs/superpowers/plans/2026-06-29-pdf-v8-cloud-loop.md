# PDF v8 — Cloud Cursor Loop Plan

F1–F5 delivered on branch `cursor/cloud-agent-1782726161423-c8rad` (PR #203).

| Phase | Delivered |
|-------|-----------|
| F1 | Three source modes, filesystem upload, sync generate with PDF bytes |
| F2 | `ingest_jobs`, async ingest worker, GET/DELETE pdf-uploads, library picker UI |
| F3 | `document_chunks`, embedding + cosine search, `USE_RAG=1` gate |
| F4 | Agentic search (max 3 steps), retrieval trace |
| F5 | `generation_jobs`, async generate + stream poll, `includePdfImages`, `VITE_ASYNC_GENERATE` |

Deferred: R2 prod storage (`@aws-sdk/client-s3`), pgvector extension (uses `real[]`).
