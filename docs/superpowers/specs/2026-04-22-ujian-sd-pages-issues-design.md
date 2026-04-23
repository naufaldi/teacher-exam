# Ujian SD — Full UI Build-out & GitHub Issues Spec

**Date:** 2026-04-22  
**Status:** Draft  
**Scope:** Build missing pages, add shared components, create GitHub issues for full project management

---

## 1. Current State

### 1.1 Existing Pages (6 routes, all with mock data)

| Route | File | Status |
|-------|------|--------|
| `/` (Login) | `index.tsx` | Complete |
| `/dashboard` | `_auth.dashboard.tsx` | Complete (mock) |
| `/generate` | `_auth.generate.tsx` | Complete (mock) |
| `/review` | `_auth.review.tsx` | Complete (mock) |
| `/preview` | `_auth.preview.tsx` | Complete (mock) |
| `/history` | `_auth.history.tsx` | Complete (mock) |

### 1.2 What's Missing

| Item | Type | PRD Reference |
|------|------|---------------|
| Correction page (`/correction/:examId`) | New route | US-19, US-20 |
| Toast/notification system | Shared component | Cross-cutting |
| Loading spinner (full-page) | Shared component | Cross-cutting |
| 404 Not Found page | Route config | Cross-cutting |
| Error boundary | Route config | Cross-cutting |
| Nav bug fix | Bug | `_auth.tsx` line 9 |

### 1.3 Nav Bug

In `_auth.tsx` line 9: `{ to: '/review', label: 'Koreksi Cepat' }` — this incorrectly labels the AI question review page as "Koreksi Cepat". The review page (`/review`) is for accept/reject/edit of AI-generated questions, not the student correction tool.

**Fix:** Replace with `{ to: '/correction/exam-001', label: 'Koreksi Cepat' }` for now (mock), or remove it entirely since correction is accessed per-exam from the history table.

---

## 2. New Route: Correction Page

**File:** `apps/web/src/routes/_auth.correction.$examId.tsx`  
**URL:** `/correction/:examId`  
**PRD:** US-19 (Koreksi Cepat), US-20 (Rekap Skor Kelas)

### 2.1 Layout

Two-panel layout (desktop):
- **Left panel (60%):** Answer input grid + student name + score display
- **Right panel (40%):** Rekap table + class stats

On smaller screens, stack vertically (rekap below input).

### 2.2 Answer Input Grid

- 20 rows, each row: `[No] [A] [B] [C] [D] [Result]`
- A/B/C/D are radio-style buttons (use existing `Button` component with toggle state)
- On selection → instant feedback:
  - Correct: green checkmark ✅
  - Wrong: red X ❌ + "(jawaban benar: B)" text
- Active/focused row is highlighted for keyboard navigation

### 2.3 Score Display

- Top of left panel: "Benar: X / 20 — Nilai: Y / 100"
- Use `<Progress>` component from `packages/ui` for visual bar
- Updates in real-time on every answer click

### 2.4 Student Management

- Text input for student name (optional, defaults to "Murid 1", "Murid 2", etc.)
- "Murid Berikutnya" button → pushes current result to rekap, resets form
- "Reset" button → clears current answers without saving

### 2.5 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| A/B/C/D | Select answer for focused question |
| Enter / Tab | Move to next question |
| Shift+Tab | Move to previous question |
| ↑/↓ | Navigate between questions |

Implemented via `useEffect` with `keydown` listener on the grid container.

### 2.6 Rekap Table (Right Panel)

| Column | Content |
|--------|---------|
| No | Auto-increment |
| Nama Murid | From text input |
| Benar | Count of correct answers |
| Salah | Count of wrong answers |
| Nilai | Score out of 100 (benar × 5) |

Footer stats: Rata-rata, Nilai Tertinggi, Nilai Terendah.

### 2.7 Print

- "Cetak Hasil Murid" → prints current student score card
- "Cetak Rekap Kelas" → prints rekap table with stats
- Use `data-print-section` pattern from existing preview page

### 2.8 Warning

Persistent banner at top: "⚠ Data koreksi tersimpan di browser saja. Data akan hilang jika halaman ditutup. Cetak terlebih dahulu jika perlu."

### 2.9 State Management

All state in a `useReducer`:
```ts
type CorrectionState = {
  answerKey: Answer[]           // from exam questions
  currentAnswers: (Answer | null)[]  // 20 slots
  studentName: string
  activeIndex: number           // focused question (0-19)
  rekapList: StudentResult[]    // accumulated results
}
```

No external store, no persistence. Data lives and dies with the component.

### 2.10 Mock Data

- Answer key: derived from `MOCK_QUESTIONS[].correctAnswer` for `examId === 'exam-001'`
- Student names: `MOCK_STUDENTS` array (10 names, already exists)
- No new mock data needed

---

## 3. Shared Components

### 3.1 Toast System

**Files:**
- `packages/ui/src/components/toast.tsx` — Toast component
- `packages/ui/src/components/toast-provider.tsx` — Context provider + portal

**Design:**
- Position: bottom-right, stacked (max 3 visible)
- Variants: `success`, `error`, `warning`, `info` (using existing status color tokens)
- Auto-dismiss: 5 seconds default
- Hook: `useToast()` → `{ toast({ title, description, variant }), dismiss(id) }`
- Mount `<ToastProvider>` in `__root.tsx`

### 3.2 Loading Spinner

**File:** `packages/ui/src/components/loading-spinner.tsx`

Centered full-page spinner for route-level `pendingComponent`. Uses `kertas-200` color for the animation.

### 3.3 404 Not Found

Add `notFoundComponent` to root route in `__root.tsx`:
- Use existing `EmptyState` component
- Message: "Halaman tidak ditemukan"
- Button: "Kembali ke Dashboard" → navigate to `/dashboard`

### 3.4 Error Boundary

Add `errorComponent` to root route in `__root.tsx`:
- Show error message in dev mode
- "Muat Ulang" button → `window.location.reload()`
- Friendly illustration/message for production

---

## 4. Mock Data Strategy

**Principle:** Minimal but complete — enough for every page to be demo-walkable.

| Page | Mock Data Source | Already Exists? |
|------|-----------------|----------------|
| Login | N/A (static) | ✅ |
| Dashboard | `MOCK_DASHBOARD_STATS`, `getMockExams()` | ✅ |
| Generate | N/A (form, simulated generate) | ✅ |
| Review | `MOCK_EXAM_WITH_QUESTIONS`, `MOCK_EXAM_FINAL` | ✅ |
| Preview | `useExamDraft()` store | ✅ |
| History | `getMockExamHistory()` (9 exams) | ✅ |
| Correction | `MOCK_QUESTIONS` (answer key) + `MOCK_STUDENTS` | ✅ |

**No new mock data files needed.** The correction page derives its answer key from the existing 20 questions.

---

## 5. GitHub Issues (7 Epic-Based)

### Issue 1: `[Epic 1] Authentication — Google OAuth, session, protected routes`

**Labels:** `epic:auth`, `frontend`, `backend`, `integration`

**Frontend:**
- [ ] Verify Google OAuth redirect works with live API
- [ ] Display real user name/avatar from session context
- [ ] Logout flow: clear session → redirect to `/`
- [ ] Handle expired session (redirect + optional toast)

**Backend:**
- [ ] Verify better-auth Google OAuth config
- [ ] Verify `GET /api/auth/get-session` returns expected shape
- [ ] Ensure user upsert in `users` table on OAuth login
- [ ] Verify `requireAuth` middleware extracts userId

**Integration:**
- [ ] Test full flow: login → dashboard → logout → redirect

**Key files:** `apps/web/src/routes/index.tsx`, `_auth.tsx`, `apps/api/src/lib/auth.ts`, `apps/api/src/middleware/auth.ts`

---

### Issue 2: `[Epic 2] AI exam generation — Claude API, PDF upload, generate form`

**Labels:** `epic:generate`, `frontend`, `backend`, `integration`

**Frontend:**
- [ ] Wire form submission to `POST /api/exams/generate`
- [ ] Wire file upload to `POST /api/uploads/pdf`
- [ ] Replace simulated progress with real API polling
- [ ] On success: navigate to `/review?examId={id}`
- [ ] On failure: show error dialog with API message
- [ ] Client-side validation against `GenerateExamInputSchema`

**Backend:**
- [ ] `POST /api/exams/generate` — create exam + call Claude API + insert 20 questions
- [ ] AI service (`apps/api/src/lib/ai.ts`) — Anthropic SDK, hardcoded CP Fase C prompt
- [ ] `POST /api/uploads/pdf` — multipart upload, text extraction, store in `pdf_uploads`
- [ ] Validate AI output against `GeneratedQuestionSchema`

**Integration:**
- [ ] Add `api.exams.generate()` and `api.uploads.pdf()` to `apps/web/src/lib/api.ts`
- [ ] Test: fill form → upload PDF → generate → see 20 questions in review

**Key files:** `_auth.generate.tsx`, `apps/api/src/routes/exams.ts` (new), `apps/api/src/routes/uploads.ts` (new), `apps/api/src/lib/ai.ts` (new)

---

### Issue 3: `[Epic 3] Exam review — slow/fast track, question editing, finalize`

**Labels:** `epic:review`, `frontend`, `backend`, `integration`

**Frontend:**
- [ ] Load exam data from API via `examId` search param
- [ ] Wire accept/reject to `PATCH /api/questions/:id`
- [ ] Wire edit dialog save to `PATCH /api/questions/:id`
- [ ] Wire metadata form to `PATCH /api/exams/:id`
- [ ] Wire finalize to `POST /api/exams/:id/finalize` → navigate to `/preview`

**Backend:**
- [ ] `PATCH /api/questions/:id` — update question (validate ownership)
- [ ] `PATCH /api/exams/:id` — update metadata
- [ ] `POST /api/exams/:id/finalize` — verify all accepted, set status=final

**Integration:**
- [ ] Add `api.questions.patch()`, `api.exams.finalize()` to api client
- [ ] Test both review modes end-to-end

**Key files:** `_auth.review.tsx`, review dialog components, `apps/api/src/routes/questions.ts` (new), `apps/api/src/routes/exams.ts`

---

### Issue 4: `[Epic 4] Preview & print — API integration, print CSS polish`

**Labels:** `epic:preview`, `frontend`, `backend`, `integration`

**Frontend:**
- [ ] Add `examId` search param for loading finalized exams from API
- [ ] Add loading/error states for data fetching
- [ ] Print CSS verification: A4, 2cm margins, page breaks, serif font
- [ ] Verify 2-column layout doesn't break across pages

**Backend:**
- [ ] `GET /api/exams/:id` returns full `ExamWithQuestions`

**Integration:**
- [ ] History "Cetak" → `/preview?examId={id}`
- [ ] Review finalize → `/preview` (uses draft store)
- [ ] Test print output for all 3 sections

**Key files:** `_auth.preview.tsx`, `app.css` (print CSS), `apps/api/src/routes/exams.ts`

---

### Issue 5: `[Epic 5] Koreksi Cepat & Rekap — correction tool, keyboard shortcuts`

**Labels:** `epic:correction`, `frontend`

**Frontend:**
- [ ] Create `_auth.correction.$examId.tsx` route
- [ ] Answer input grid (20 rows × A/B/C/D)
- [ ] Instant feedback (✅/❌ with correct answer)
- [ ] Live score with Progress bar
- [ ] Student name input + auto-numbering
- [ ] Keyboard shortcuts (A/B/C/D, Enter/Tab, arrows)
- [ ] "Murid Berikutnya" → push to rekap, reset form
- [ ] Rekap table with class stats (rata-rata, max, min)
- [ ] Print buttons (Cetak Hasil, Cetak Rekap)
- [ ] Warning banner about data loss
- [ ] Fix nav link in `_auth.tsx` (remove misleading "Koreksi Cepat" → `/review`)

**Backend:** None (client-side only per PRD)

**Integration:**
- [ ] History "Koreksi" button → `/correction/{examId}` (final exams only)
- [ ] Load answer key from `GET /api/exams/:id` when backend exists

**Key files:** `_auth.correction.$examId.tsx` (new), `_auth.tsx` (nav fix), `mock-data.ts`

---

### Issue 6: `[Epic 6] Exam history — API integration, CRUD actions`

**Labels:** `epic:history`, `frontend`, `backend`, `integration`

**Frontend:**
- [ ] Replace `getMockExamHistory()` with `api.exams.list()`
- [ ] Wire action buttons: Cetak, Koreksi, Edit, Duplikat, Hapus
- [ ] Add confirmation dialog for Hapus
- [ ] Show success toast on Duplikat/Hapus

**Backend:**
- [ ] `GET /api/exams` — list user's exams (with optional filters)
- [ ] `DELETE /api/exams/:id` — delete with ownership check
- [ ] `POST /api/exams/:id/duplicate` — clone exam + questions as new draft

**Integration:**
- [ ] Add `api.exams.duplicate()` to api client
- [ ] Test: create → finalize → see in history → duplicate → delete

**Key files:** `_auth.history.tsx`, `history-table.tsx`, `apps/api/src/routes/exams.ts`

---

### Issue 7: `[Cross-cutting] Toast, loading, 404, error boundary, error handling`

**Labels:** `infrastructure`, `frontend`, `backend`

**Frontend:**
- [ ] Toast system in `packages/ui` (component + provider + hook)
- [ ] Loading spinner in `packages/ui`
- [ ] 404 `notFoundComponent` in `__root.tsx`
- [ ] Error boundary `errorComponent` in `__root.tsx`
- [ ] Mount `<ToastProvider>` in `__root.tsx`
- [ ] Migrate ad-hoc `GenerateSuccessToast` to shared toast

**Backend:**
- [ ] Standardize error response format: `{ error, code, details }`
- [ ] Map Effect-TS tagged errors to HTTP status codes
- [ ] Error handler middleware

**Integration:**
- [ ] API client parses error responses
- [ ] Mutations show error toast on failure
- [ ] Queries show inline error state with retry

**Key files:** `packages/ui/src/components/toast.tsx` (new), `toast-provider.tsx` (new), `loading-spinner.tsx` (new), `__root.tsx`, `apps/api/src/middleware/error-handler.ts` (new)

---

## 6. Dependency Graph

```
Issue 7 (infra) ─── should be first ──┬── Issue 1 (auth)
                                       ├── Issue 5 (correction) ← no backend dep
                                       ├── Issue 2 (generate) → Issue 3 (review) → Issue 4 (preview)
                                       └── Issue 6 (history)
```

**Parallelizable:**
- Issue 5 (correction, client-only) + Issue 7 (infra) can start immediately
- Backend routes for Issues 2, 3, 4, 6 share `apps/api/src/routes/exams.ts`

**Sequential:**
- Issue 3 depends on Issue 2 (generation creates exams)
- Issue 4 depends on Issue 3 (finalize creates printable exams)

---

## 7. Acceptance Criteria

| Issue | Done When |
|-------|-----------|
| 1 | Google login → dashboard → logout → redirect works |
| 2 | Form generates 20 AI questions stored in DB |
| 3 | Teacher can review/edit/finalize all 20 questions |
| 4 | Finalized exam prints correctly in TKA A4 format |
| 5 | Teacher can correct 30 students, see scores, print rekap |
| 6 | History loads from API, all 5 actions work |
| 7 | Toast/loading/404/error boundary all functional |
