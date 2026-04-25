# Phase 2 — Variable Total Soal + Jenis Defaults

## Context

Phase 1 shipped multi-topic selection (merged as PR #17). The AI generator is still **hardcoded to produce exactly 20 questions** everywhere: `AiService.generate` throws if `questions.length !== 20`, the prompt template says "tepat 20 soal" in 3 places, and each `exam-type-profile.difficultyDist` sums to 20. Real Indonesian SD papers have different lengths per jenis (Latihan 20, UTS/UAS/TKA commonly 25). Phase 2 un-hardcodes the 20 into a `totalSoal` field (range 5–50) driven by jenis presets and overridable in the form.

**Product decisions (confirmed):**
- `totalSoal` is **not persisted** on the exam row — derived from `questions.length` on read. No DB migration.
- Points stay as `pointsPerQuestion = Math.round(100 / totalSoal)` so the paper total stays ≈ 100. Preview footer shows real total.
- Difficulty distribution rescales proportionally at request time (ratios × totalSoal, rounded, last bucket absorbs remainder).
- API schema: `totalSoal: Schema.optional(Schema.Int.pipe(Schema.between(5, 50)))`. Backend falls back to `EXAM_TYPE_PROFILE[examType].defaultTotalSoal` when omitted.
- Jenis defaults: Latihan=20, Formatif=20, STS=25, SAS=25, TKA=25.

## Architecture

One Effect Schema field (`totalSoal`) threads through: UI form → API input → prompt builder → AI service validator → response. The profile module grows a `defaultTotalSoal` per jenis and a `rescaleDifficultyDist(examType, total)` helper. The prompt template interpolates `{totalSoal}` in three places. The UI form gains a "Jumlah Soal" numeric input that auto-fills on jenis change and can be overridden.

## Tech Stack

Effect Schema, Hono v4, React 19, TanStack Router, Vitest, TDD.

---

## File Structure

**Modify:**
- `packages/shared/src/schemas/api.ts` — add `totalSoal` field to `GenerateExamInputSchema`
- `apps/api/src/lib/exam-type-profile.ts` — add `defaultTotalSoal`, add `rescaleDifficultyDist` helper
- `apps/api/src/lib/prompt.ts` — accept `totalSoal`, template into all 3 hardcoded-20 spots
- `apps/api/src/services/AiService.ts` — accept `expectedCount`, replace `!== 20` assertion
- `apps/api/src/routes/ai.ts` — resolve `totalSoal` (input or default), thread through
- `apps/web/src/routes/_auth.generate.tsx` — add "Jumlah Soal" input, auto-fill on jenis change, remove every hardcoded "20 soal" copy
- `apps/web/src/routes/_auth.preview.tsx` — replace hardcoded `* 5` with `pointsPerQuestion(n) * n`

**Create:**
- `apps/api/src/lib/__test__/exam-type-profile.test.ts`
- `apps/web/src/lib/points.ts` — `pointsPerQuestion(total: number): number` helper
- `apps/web/src/lib/__test__/points.test.ts`

---

## Task 1: Extend `exam-type-profile.ts` with defaults + rescale helper

- [ ] Write failing tests for `defaultTotalSoal` and `rescaleDifficultyDist` in `apps/api/src/lib/__test__/exam-type-profile.test.ts`:
  - `latihan.defaultTotalSoal === 20`, `sas.defaultTotalSoal === 25`, `tka.defaultTotalSoal === 25`
  - `rescaleDifficultyDist('latihan', 20)` returns `{mudah:8, sedang:8, sukar:4}`
  - `rescaleDifficultyDist('latihan', 25)` sums to 25
  - `rescaleDifficultyDist('tka', 30)` sums to 30
  - `rescaleDifficultyDist('sas', 5)` sums to 5; `rescaleDifficultyDist('sas', 50)` sums to 50
- [ ] Run: `pnpm --filter @teacher-exam/api test exam-type-profile` → FAIL
- [ ] Add `defaultTotalSoal: number` to `ExamTypeProfile` type and each profile entry (latihan/formatif=20, sts/sas/tka=25)
- [ ] Append `rescaleDifficultyDist(examType, totalSoal)` helper that computes `mudah = round(base.mudah/baseTotal * totalSoal)`, `sedang = round(...)`, `sukar = totalSoal - mudah - sedang`
- [ ] Replace the "Sum must equal 20." comment with a note that values are the baseline at `defaultTotalSoal` and use `rescaleDifficultyDist` for other totals
- [ ] Run tests → PASS
- [ ] Commit: `feat(api): exam-type-profile gains defaultTotalSoal and rescale helper`

---

## Task 2: Add `totalSoal` to `GenerateExamInputSchema`

- [ ] Add failing tests in `packages/shared/src/schemas/__test__/api.test.ts`:
  - accepts `totalSoal: 20`
  - rejects `totalSoal: 4` (below min)
  - rejects `totalSoal: 51` (above max)
  - accepts input omitting `totalSoal`
- [ ] Run: `pnpm --filter @teacher-exam/shared test api` → FAIL
- [ ] In `packages/shared/src/schemas/api.ts` inside `GenerateExamInputSchema`, add: `totalSoal: Schema.optional(Schema.Int.pipe(Schema.between(5, 50))),`
- [ ] Run tests → PASS
- [ ] Commit: `feat(shared): add optional totalSoal (5-50) to GenerateExamInputSchema`

---

## Task 3: Thread `totalSoal` through `buildExamPrompt`

- [ ] Add failing tests in `apps/api/src/lib/__test__/prompt.test.ts`:
  - `buildExamPrompt({...totalSoal:25}).system` contains `'tepat 25 soal'` and NOT `'tepat 20 soal'`
  - `buildExamPrompt({...totalSoal:30}).user` contains `'30 soal'`
  - `buildExamPrompt({topics:['A','B','C'], totalSoal:30}).user` contains `'10 soal per topik'`
- [ ] Run: `pnpm --filter @teacher-exam/api test prompt` → FAIL
- [ ] In `apps/api/src/lib/prompt.ts`:
  - Add `totalSoal: number` to `BuildPromptInput`
  - Replace L44 `'tepat 20 soal pilihan ganda'` with interpolated `` `tepat ${input.totalSoal} soal pilihan ganda` ``
  - Replace L57 `Math.round(20 / input.topics.length)` with `Math.round(input.totalSoal / input.topics.length)`
  - Replace L76 `'Buatkan satu lembar berisi 20 soal pilihan ganda'` with interpolated version using `input.totalSoal`
  - Add `totalSoal: input.totalSoal` to the `params` object (L60-67)
- [ ] Run tests → PASS
- [ ] Commit: `feat(api): buildExamPrompt accepts totalSoal, removes hardcoded 20`

---

## Task 4: Thread `expectedCount` through `AiService.generate`

- [ ] Add failing tests in `apps/api/src/services/__test__/AiService.test.ts`:
  - Given a fake AI client returning 20 valid questions, call `generate({...expectedCount: 25})` → throws `AiGenerationError` with message `'Expected 25 questions, got 20'`
  - Given a fake returning 25 questions and `expectedCount: 25` → resolves with the 25 questions
- [ ] Run: `pnpm --filter @teacher-exam/api test AiService` → FAIL
- [ ] In `apps/api/src/services/AiService.ts`:
  - Extend `GenerateInput` with `expectedCount: number`
  - Replace the hardcoded `!== 20` assertion (L92) with `!== input.expectedCount` and update the error message to reference `input.expectedCount`
- [ ] Run tests → PASS
- [ ] Commit: `feat(api): AiService validates against expectedCount instead of 20`

---

## Task 5: Resolve `totalSoal` in `routes/ai.ts`

- [ ] Add failing tests in `apps/api/src/routes/__test__/ai.test.ts`:
  - POST with `examType:'sas'` and no `totalSoal` → AiService receives `expectedCount: 25`
  - POST with `examType:'sas', totalSoal: 30` → AiService receives `expectedCount: 30`
- [ ] Run: `pnpm --filter @teacher-exam/api test routes/__test__/ai` → FAIL
- [ ] In `apps/api/src/routes/ai.ts`, after decoding input:
  - `import { EXAM_TYPE_PROFILE } from '../lib/exam-type-profile'`
  - `const examType = input.examType ?? 'latihan'`
  - `const totalSoal = input.totalSoal ?? EXAM_TYPE_PROFILE[examType].defaultTotalSoal`
  - Pass `totalSoal` into `buildExamPrompt({...})`
  - Pass `expectedCount: totalSoal` into `aiService.generate({...})`
- [ ] Run tests → PASS
- [ ] Commit: `feat(api): resolve totalSoal from input or profile default`

---

## Task 6: Add `pointsPerQuestion` helper

- [ ] Write failing tests in `apps/web/src/lib/__test__/points.test.ts`:
  - `pointsPerQuestion(20) === 5`
  - `pointsPerQuestion(25) === 4`
  - `pointsPerQuestion(50) === 2`
  - `pointsPerQuestion(10) === 10`
  - `pointsPerQuestion(200) >= 1` (floor guard)
- [ ] Run: `pnpm --filter @teacher-exam/web test points` → FAIL
- [ ] Create `apps/web/src/lib/points.ts`:
  ```ts
  export function pointsPerQuestion(totalSoal: number): number {
    return Math.max(1, Math.round(100 / totalSoal))
  }
  ```
- [ ] Run tests → PASS
- [ ] Commit: `feat(web): pointsPerQuestion helper (target total ≈ 100)`

---

## Task 7: Wire variable points into print preview

- [ ] Add failing tests in `apps/web/src/routes/__test__/_auth.preview.test.tsx`:
  - Render with mock exam of 25 questions → footer contains text matching `/25 soal × 4 poin/` and `/100 poin/`
  - Render with mock exam of 10 questions → footer contains `/10 poin per jawaban/` and total `/100 poin/`
- [ ] Run: `pnpm --filter @teacher-exam/web test _auth.preview` → FAIL
- [ ] In `apps/web/src/routes/_auth.preview.tsx` near L412:
  - `import { pointsPerQuestion } from '../lib/points'`
  - Compute `const poinPerSoal = pointsPerQuestion(questions.length)` and `const totalPoin = questions.length * poinPerSoal`
  - Replace the hardcoded `{questions.length * 5} poin` with `{totalPoin} poin`
  - Replace any "5 poin per jawaban" literal with `` `${poinPerSoal} poin per jawaban` ``
- [ ] Run tests → PASS
- [ ] Commit: `feat(web): preview scales points per question to keep total ≈ 100`

---

## Task 8: Add "Jumlah Soal" input + auto-fill on jenis change + remove hardcoded copy

- [ ] Add failing tests in `apps/web/src/routes/__test__/_auth.generate.test.tsx`:
  - "Jumlah Soal" input defaults to 20 for default jenis (formatif)
  - Clicking jenis UAS auto-fills "Jumlah Soal" to 25
  - User overriding "Jumlah Soal" to 35 after selecting UAS keeps 35 until jenis changes again
  - Submitting form sends `totalSoal` in the `api.ai.generate` payload
  - Entering `3` shows error "Minimum 5 soal"
  - Entering `51` shows error "Maksimum 50 soal"
- [ ] Run: `pnpm --filter @teacher-exam/web test _auth.generate` → FAIL
- [ ] In `apps/web/src/routes/_auth.generate.tsx`:
  - Near L193 add constant `DEFAULT_TOTAL_SOAL_BY_JENIS: Record<ExamType, number> = { latihan:20, formatif:20, sts:25, sas:25, tka:25 }`
  - Add state `const [totalSoal, setTotalSoal] = useState(DEFAULT_TOTAL_SOAL_BY_JENIS.formatif)` and `const [totalSoalError, setTotalSoalError] = useState<string|null>(null)`
  - Add `handleJenisChange(next: ExamType)` that calls `setExamType(next)`, `setTotalSoal(DEFAULT_TOTAL_SOAL_BY_JENIS[next])`, `setTotalSoalError(null)`. Wire the radio group to call it (replacing direct `setExamType`)
  - Add a labeled `<Input type="number" min={5} max={50}>` under the jenis group with onChange validating bounds and setting the error
  - In the `api.ai.generate` body (L255-264), include `totalSoal`
  - Disable submit while `totalSoalError != null`
  - Replace every "20 soal" literal with `` `${totalSoal} soal` `` at: L356 hero copy, L560 badge, L583 "Auto-terima 20 soal", L716 helper text, L819 sidebar badge
- [ ] Run tests → PASS
- [ ] Commit: `feat(web): Jumlah Soal input with jenis auto-fill, remove hardcoded 20`

---

## Task 9: Integration verification

- [ ] `pnpm type-check` → zero errors across shared/api/web
- [ ] `pnpm test` → all green (expect ~20 new tests)
- [ ] `rg '20 soal|!== 20|=== 20|\\* 5 poin' apps/ packages/` → only matches are inline comments or old snapshot strings inside test assertions for specific counts; no live hardcodes
- [ ] Start `pnpm dev`, log in
- [ ] `/generate`: switch jenis → "Jumlah Soal" auto-fills per preset
- [ ] Override to 30, select 3 topics, submit → result page shows 30 questions
- [ ] Print preview footer reads `30 soal × 3 poin = 90 poin` (or similar rounded value)
- [ ] Reset to Latihan (20) → footer reads `20 soal × 5 poin = 100 poin`
- [ ] No console errors/warnings via agent-browser flow
- [ ] Screenshot `.agent-browser/phase2-variable-total.png`

**Commit:** none (verification only).

---

## Out of Scope (handled by Phase 3)

- Multiple question types (PGK multi-answer, Benar/Salah)
- Per-jenis question-type composition (UAS = 15 PG + 5 PGK + 5 B/S)
- Question type tagged union schema

Phase 3 will extend `exam-type-profile.ts` with a `composition` field and `GenerateExamInputSchema` with composition overrides. The `totalSoal` plumbing from Phase 2 is the anchor; Phase 3 subdivides the count into types.

---

## Self-review checklist

- **Spec coverage:** every decision (optional totalSoal, 5-50 range, jenis default fallback, proportional rescale, Math.round(100/N) points) maps to a task.
- **Type consistency:** `expectedCount` on AiService input, `totalSoal` on schema/prompt/route, `pointsPerQuestion` on web — names used consistently across Tasks 1-8.
- **No placeholders:** every code change specifies the exact symbol/line to change. Test expectations are concrete.
- **TDD:** every task starts with a failing test, ends with a passing test and commit.
