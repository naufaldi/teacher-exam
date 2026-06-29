# Design: Bank Soal Core (Batch A) + Auto-Save + Exam-Driven Publish

> **Status:** Approved | **Date:** 2026-05-27 | **Author:** Brainstorming Session
> **Tracking:** [#70 — PRD v4 Bank Soal + Exam Builder](https://github.com/naufaldi/teacher-exam/issues/70)
> **Scope:** E3, E4, E6, E7 (core bank API) + auto-save after review + exam-driven publish

> **Addendum (2026-06-29 — public share page):** `POST /api/exams/:id/share` creates a public slug; recipients open `/share/:slug` (anonymous) with full print/export parity to `/preview`. See [RFC 2026-06-29-public-exam-share](../../rfc/2026-06-29-public-exam-share-rfc.md).

> **Addendum (2026-06-29 — unified SheetTable):** Bank Soal UI memakai `SheetTable` (`bank-mine` / `bank-public`) bersama Dashboard dan Riwayat. Pratinjau lembar via `SheetPreviewDialog`; **Pakai lembar** tetap mengarah ke `/preview` dengan exam baru. Lihat [RFC 2026-06-29-unified-sheet-table](../../rfc/2026-06-29-unified-sheet-table-rfc.md).

> **Addendum (2026-06-29 — per-lembar bank):** Bank Soal browse unit is **lembar ujian** (`exams` with `bankedAt`), not individual `bank_questions`. Finalizing sets `bankedAt` + `isPublic = true`. API: `GET /api/bank/sheets`, `GET /api/bank/sheets/public`, `POST /api/bank/use-sheet`. Legacy per-question endpoints remain for backward compatibility but are not used by the Bank Soal UI.

---

## 1. Overview

This design covers the **foundation layer** of the Bank Soal feature — the core CRUD API that all future bank UI and builder features depend on. It also introduces two enhancements over the original PRD v4:

1. **Auto-save to bank** — all accepted questions from a generated exam are automatically saved to the teacher's bank after review completes (no manual "Simpan ke Bank" clicks needed).
2. **Exam-driven publish** — when a teacher shares an exam (existing `POST /api/exams/:id/share`), all bank questions derived from that exam automatically become public. No per-question toggle needed.

### What this does NOT cover

- Frontend bank UI (Batch C — separate task)
- Public bank browse with IP rate limiting (E5, E17 — Batch B)
- Exam Builder assembly endpoint (E8 — Batch B)
- Bank statistics (E14 — Batch D)

---

## 2. Data Flow

```
Generate Exam (existing)
    |
    v
Teacher Reviews (fast/slow track)
    |
    v
Auto-Save Hook (NEW)
    All accepted questions -> INSERT bank_questions (isPublic=false)
    |
    v
Teacher Shares Exam (existing POST /api/exams/:id/share)
    |
    v
Publish Propagation (NEW)
    All bank_questions WHERE questionId IN exam's questions
    -> UPDATE isPublic = true
```

### Key invariant

`bank_questions.isPublic` is **derived from the parent exam's publish status**. A bank question becomes public when and only when its source exam is shared. Unsharing an exam (future) would flip its bank questions back to private.

---

## 3. API Endpoints

### 3.1 New Endpoints (Bank group)

All endpoints require auth. Registered under `/api/bank` prefix.

| Method | Path | Purpose | Idempotency |
|--------|------|---------|-------------|
| `POST` | `/api/bank` | Save a question to bank | Unique constraint `(userId, questionId)` — returns existing row if duplicate |
| `GET` | `/api/bank` | Browse own bank | Supports filter, search, pagination |
| `PATCH` | `/api/bank/:id` | Update bank question metadata | — |
| `DELETE` | `/api/bank/:id` | Remove from own bank | — |

**Note:** `GET /api/bank/public` (E5) is deferred to Batch B. The core API here is own-bank only.

### 3.2 Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/exams/:id/share` | After setting exam `isPublic=true`, also set `bank_questions.isPublic=true` for all bank entries linked to this exam's questions |

### 3.3 Auto-Save (internal, no new endpoint)

After the review process completes (questions move to `accepted` status), the system automatically inserts accepted questions into `bank_questions`. This is triggered internally in the AI generation flow — specifically after the question insertion transaction in `ai-generate.ts`.

**Fast track:** All questions are inserted as `accepted` immediately — auto-save fires right after the generate transaction.

**Slow track:** Questions are inserted as `pending` and accepted individually during review. Auto-save fires each time a question is accepted via `PATCH /api/questions/:id` with `status: 'accepted'`.

---

## 4. Shared Schemas

New file: `packages/shared/src/schemas/bank.ts`

### SaveToBankInput

```typescript
export const SaveToBankInput = Schema.Struct({
  questionId: Schema.String.pipe(Schema.brand('QuestionId')),
})
```

### BrowseBankQuery

```typescript
export const BrowseBankQuery = Schema.Struct({
  subject: Schema.optional(ExamSubjectSchema),
  grade: Schema.optional(Schema.Number),
  difficulty: Schema.optional(ExamDifficultySchema),
  topic: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  page: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThan(0))),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(1, 100))),
})
```

### BankQuestionResponse

```typescript
export const BankQuestionResponse = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('BankQuestionId')),
  questionId: Schema.String.pipe(Schema.brand('QuestionId')),
  userId: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Number,
  topics: Schema.Array(Schema.String),
  difficulty: ExamDifficultySchema,
  type: Schema.String,
  payload: Schema.Unknown,
  isPublic: Schema.Boolean,
  usageCount: Schema.Number,
  createdAt: Schema.String,
  text: Schema.String,
  optionA: Schema.optional(Schema.NullOr(Schema.String)),
  optionB: Schema.optional(Schema.NullOr(Schema.String)),
  optionC: Schema.optional(Schema.NullOr(Schema.String)),
  optionD: Schema.optional(Schema.NullOr(Schema.String)),
  correctAnswer: Schema.optional(Schema.NullOr(AnswerSchema)),
})
```

### UpdateBankQuestionInput

```typescript
export const UpdateBankQuestionInput = Schema.Struct({
  isPublic: Schema.optional(Schema.Boolean),
})
```

### PaginatedBankResponse

```typescript
export const PaginatedBankResponse = Schema.Struct({
  data: Schema.Array(BankQuestionResponse),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number,
})
```

---

## 5. Service Layer

### BankService (Effect Context.Tag)

```typescript
class BankService extends Context.Tag('BankService')<BankService, {
  saveQuestion(input: SaveToBankInput, userId: string): Effect.Effect<BankQuestionRow, ApiError>
  browseOwn(query: BrowseBankQuery, userId: string): Effect.Effect<PaginatedBankResponse, never>
  update(id: string, input: UpdateBankQuestionInput, userId: string): Effect.Effect<BankQuestionRow, ApiError>
  remove(id: string, userId: string): Effect.Effect<void, ApiError>
  autoSaveAccepted(examId: string, userId: string): Effect.Effect<void, never>
  propagatePublish(examId: string, userId: string): Effect.Effect<void, never>
}>() {}
```

### Layer wiring

Add `BankServiceLive` to `HandlersLive` in `AppLayer.ts`. It depends on `DbClient` (already in `CoreLive`).

---

## 6. File Changes

### New files

| File | Purpose |
|------|---------|
| `packages/shared/src/schemas/bank.ts` | Shared schemas for bank API |
| `apps/api/src/api/groups/bank.ts` | Bank endpoint group definition (schemas, methods, errors) |
| `apps/api/src/api/handlers/bank.ts` | Bank handler implementations |
| `apps/api/src/api/services/BankService.ts` | BankService Context.Tag + Live layer |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Export bank schemas |
| `apps/api/src/api/definition.ts` | Register `BankGroup` in the API |
| `apps/api/src/api/handlers/exams.ts` | In `shareExam`: call `BankService.propagatePublish()` after setting exam public |
| `apps/api/src/lib/ai-generate.ts` | After question insert transaction: call `BankService.autoSaveAccepted()` for fast-track |
| `apps/api/src/api/handlers/questions.ts` | In `patchQuestion`: when status changes to `accepted`, call `BankService.autoSaveAccepted()` for slow-track |
| `apps/api/src/layers/AppLayer.ts` | Add `BankLive` to `HandlersLive` |

---

## 7. Error Handling

All bank errors use `Data.TaggedError` following the project convention:

| Error | HTTP Status | When |
|-------|-------------|------|
| `BankNotFound` | 404 | Bank question ID not found or not owned by user |
| `BankDuplicate` | 200 (idempotent) | Question already in bank — return existing row |
| `BankUnauthorized` | 403 | User tries to access another user's bank question |

---

## 8. Testing Strategy

### Unit tests (BankService)

- `saveQuestion` — inserts row, returns BankQuestionResponse
- `saveQuestion` — idempotent: duplicate returns existing row without error
- `browseOwn` — pagination, filtering, search all work
- `update` — only owner can update
- `remove` — only owner can remove
- `autoSaveAccepted` — inserts all accepted questions from exam into bank
- `propagatePublish` — sets isPublic=true on all bank entries for exam's questions

### Integration tests (API handlers)

- POST /api/bank — 201 on new, 200 on duplicate
- GET /api/bank — 200 with pagination metadata
- PATCH /api/bank/:id — 200 on own, 403 on other's
- DELETE /api/bank/:id — 204 on own, 403 on other's
- POST /api/exams/:id/share — exam becomes public AND bank questions become public

### Auto-save integration tests

- Fast track generate: all questions appear in bank after generation
- Slow track: questions appear in bank as they are accepted individually

---

## 9. Database Notes

**No new migration needed.** The `bank_questions` table (migration 0008) already has all required columns:
- `id`, `userId`, `questionId` — identity + ownership
- `subject`, `grade`, `topics`, `difficulty` — denormalized metadata for fast filtering
- `type`, `payload` — question content
- `isPublic` — used for exam-driven publish propagation
- `usageCount` — available for future Exam Builder usage tracking
- `createdAt` — for sorting

The unique constraint `(userId, questionId)` ensures idempotent saves.

---

## 10. PRD Deviations (documented)

| PRD v4 says | This design does | Rationale |
|-------------|------------------|-----------|
| Manual "Simpan ke Bank" button per question | Auto-save all accepted questions after review | Fewer clicks, teachers don't forget to save |
| Per-question public/private toggle in bank UI | Exam-driven publish (inherit from parent exam) | Simpler mental model, one toggle does all |
| `bank_shares` table for sharing | Not created (deferrable) | Not needed for core flow; can add later |

These deviations are intentional and approved. The PRD should be updated to reflect them.

---

## 11. Issues Covered

| Issue | Status in this design |
|-------|----------------------|
| E1 — bank_questions migration | Already done (migration 0008) |
| E3 — POST /api/bank | Designed |
| E4 — GET /api/bank | Designed |
| E6 — PATCH /api/bank/:id | Designed |
| E7 — DELETE /api/bank/:id | Designed |
| Auto-save after review | Designed (not a separate issue) |
| Exam-driven publish | Designed (not a separate issue) |

### Deferred to later batches

| Issue | Batch |
|-------|-------|
| E2 — bank_shares table | B (if needed) |
| E5 — GET /api/bank/public | B |
| E8 — POST /api/bank/build-exam | B |
| E9 — Test coverage 80%+ | D |
| E10-E15 — Frontend | C |
| E16 — Browser verification | D |
| E17 — Public bank auth-optional + rate limit | B |
