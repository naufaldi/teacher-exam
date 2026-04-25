# Phase 1: Multi-Topic Exam Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow teachers to select 1–5 topics per exam on the Generate form; the AI distributes 20 soal evenly across all chosen topics. No question-type changes — existing single-MCQ flow keeps working.

**Architecture:** The `topic: text` column in `exams` is replaced by `topics: jsonb` (string array). The shared Effect Schema `GenerateExamInputSchema` is updated to accept an array. The AI prompt receives a topic list with even-distribution instructions. The Generate form replaces the single Radix Select with a Popover-based multi-select. Print preview shows topics joined with ` · `.

**Tech Stack:** Drizzle ORM (migration), Effect Schema, Hono, React 19 + TanStack Router, Radix Popover (already in `packages/ui`), Tailwind v4 tokens

> **Note on existing data:** This is a pre-launch dev project — existing exam rows with `topic: text` will be lost during migration. The migration drops the old column and adds the new one. Regenerate any test exams after migrating.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/db/src/schema/exams.ts` | Modify | Replace `topic: text` with `topics: jsonb` |
| `packages/shared/src/schemas/api.ts` | Modify | `topic` → `topics: string[]` in input schema |
| `packages/shared/src/schemas/entities.ts` | Modify | `topic: string` → `topics: string[]` in ExamSchema |
| `packages/shared/src/exam-title.ts` | Modify | Accept `topics: string[]` instead of `topic: string` |
| `packages/shared/src/schemas/__test__/api.test.ts` | Create | Schema validation tests |
| `packages/shared/src/schemas/__test__/entities.test.ts` | Create | ExamSchema decode test |
| `apps/api/src/lib/prompt.ts` | Modify | `topic: string` → `topics: string[]` in `BuildPromptInput` |
| `apps/api/src/lib/__test__/prompt.test.ts` | Modify | Add multi-topic prompt tests |
| `apps/api/src/routes/ai.ts` | Modify | Pass `topics` array to DB insert + prompt builder |
| `apps/api/src/routes/__test__/ai.test.ts` | Modify | Update fake question fixtures + topic assertion |
| `apps/web/src/components/generate/topic-multi-select.tsx` | Create | Popover-based multi-select pill component |
| `apps/web/src/routes/_auth.generate.tsx` | Modify | Replace `topik` string state with `topiks: string[]`; wire `TopicMultiSelect` |
| `apps/web/src/routes/_auth.preview.tsx` | Modify | `SoalSection` — show `topics.join(' · ')` in header metadata |
| `apps/web/src/components/dashboard/mini-paper-preview.tsx` | Modify | Show first 2 topics + "+N more" |

---

## Task 1: Update Shared Schemas

**Files:**
- Modify: `packages/shared/src/schemas/api.ts:14-25`
- Modify: `packages/shared/src/schemas/entities.ts:54-75`
- Modify: `packages/shared/src/exam-title.ts:1-28`
- Create: `packages/shared/src/schemas/__test__/api.test.ts`
- Create: `packages/shared/src/schemas/__test__/entities.test.ts`

- [ ] **Step 1.1: Write failing test for GenerateExamInputSchema topics bounds**

Create `packages/shared/src/schemas/__test__/api.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { Schema, Either } from 'effect'
import { GenerateExamInputSchema } from '../api.js'

const VALID_BASE = {
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'campuran',
  topics: ['Teks Narasi'],
  reviewMode: 'fast',
} as const

describe('GenerateExamInputSchema.topics', () => {
  it('accepts 1 topic', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(VALID_BASE)
    expect(Either.isRight(result)).toBe(true)
  })

  it('accepts up to 5 topics', () => {
    const input = { ...VALID_BASE, topics: ['A', 'B', 'C', 'D', 'E'] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isRight(result)).toBe(true)
  })

  it('rejects empty topics array', () => {
    const input = { ...VALID_BASE, topics: [] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('rejects more than 5 topics', () => {
    const input = { ...VALID_BASE, topics: ['A', 'B', 'C', 'D', 'E', 'F'] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('rejects empty string topics', () => {
    const input = { ...VALID_BASE, topics: ['Valid', ''] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('rejects old single-string topic field', () => {
    const input = { ...VALID_BASE, topic: 'Teks Narasi' }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(
      { ...input, topics: undefined },
    )
    expect(Either.isLeft(result)).toBe(true)
  })
})
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd packages/shared && pnpm test src/schemas/__test__/api.test.ts
```

Expected: FAIL — `topics` not found on schema / property `topic` mismatch.

- [ ] **Step 1.3: Update `GenerateExamInputSchema` in `packages/shared/src/schemas/api.ts`**

Replace lines 14–25:

```typescript
export const GenerateExamInputSchema = Schema.Struct({
  subject:          ExamSubjectSchema,
  grade:            Schema.Int.pipe(Schema.between(5, 6)),
  difficulty:       ExamDifficultySchema,
  topics:           Schema.Array(Schema.NonEmptyString).pipe(
                      Schema.minItems(1),
                      Schema.maxItems(5),
                    ),
  reviewMode:       ReviewModeSchema,
  examType:         Schema.optional(ExamTypeSchema),
  classContext:     Schema.optional(Schema.String),
  pdfUploadId:      Schema.optional(Schema.String),
  exampleQuestions: Schema.optional(Schema.String),
})
export type GenerateExamInput = typeof GenerateExamInputSchema.Type
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
cd packages/shared && pnpm test src/schemas/__test__/api.test.ts
```

Expected: all 6 pass.

- [ ] **Step 1.5: Write failing test for ExamSchema topics field**

Create `packages/shared/src/schemas/__test__/entities.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { Schema, Either } from 'effect'
import { ExamSchema } from '../entities.js'

const VALID_EXAM = {
  id: 'exam-1',
  userId: 'user-1',
  title: 'Test Exam',
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'campuran',
  topics: ['Teks Narasi', 'Puisi'],
  reviewMode: 'fast',
  status: 'draft',
  schoolName: null,
  academicYear: null,
  examType: 'formatif',
  examDate: null,
  durationMinutes: null,
  instructions: null,
  classContext: null,
  discussionMd: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const

describe('ExamSchema.topics', () => {
  it('decodes topics as string array', () => {
    const result = Schema.decodeUnknownEither(ExamSchema)(VALID_EXAM)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.topics).toEqual(['Teks Narasi', 'Puisi'])
    }
  })

  it('rejects exam with old topic string field instead of topics array', () => {
    const bad = { ...VALID_EXAM, topics: undefined, topic: 'Teks Narasi' }
    const result = Schema.decodeUnknownEither(ExamSchema)(bad)
    expect(Either.isLeft(result)).toBe(true)
  })
})
```

- [ ] **Step 1.6: Run to verify it fails**

```bash
cd packages/shared && pnpm test src/schemas/__test__/entities.test.ts
```

Expected: FAIL — ExamSchema still has `topic: Schema.String`.

- [ ] **Step 1.7: Update `ExamSchema` in `packages/shared/src/schemas/entities.ts`**

Replace line 61 (`topic: Schema.String,`) with:

```typescript
  topics:          Schema.Array(Schema.String),
```

- [ ] **Step 1.8: Run to verify it passes**

```bash
cd packages/shared && pnpm test src/schemas/__test__/entities.test.ts
```

Expected: both tests pass.

- [ ] **Step 1.9: Update `exam-title.ts` to accept `topics: string[]`**

Replace full file `packages/shared/src/exam-title.ts`:

```typescript
export interface FormatExamTitleInput {
  subjectLabel: string
  grade: number
  examType: string
  examDate: string | null
  topics: string[]
}

export function formatExamTitle(input: FormatExamTitleInput): string {
  const { subjectLabel, grade, examType, examDate, topics } = input

  const topicSegment = topics.join(', ')
  const typeSegment = examType.trim() || topicSegment
  const dateSegment = examDate
    ? new Date(examDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const parts = [
    `${subjectLabel} / Kelas ${grade}`,
    typeSegment,
    ...(dateSegment ? [dateSegment] : []),
  ]

  return parts.join(' / ').slice(0, 80)
}
```

- [ ] **Step 1.10: Run type-check on shared package**

```bash
cd packages/shared && pnpm type-check
```

Expected: 0 errors (consumers will break — fix them in later tasks).

- [ ] **Step 1.11: Commit**

```bash
git add packages/shared/src/schemas/api.ts \
        packages/shared/src/schemas/entities.ts \
        packages/shared/src/exam-title.ts \
        packages/shared/src/schemas/__test__/api.test.ts \
        packages/shared/src/schemas/__test__/entities.test.ts
git commit -m "feat(shared): topic → topics array in schemas and exam-title"
```

---

## Task 2: Update DB Schema + Run Migration

**Files:**
- Modify: `packages/db/src/schema/exams.ts:18`
- Create: `packages/db/migrations/<timestamp>_multi_topic.sql` (generated by drizzle-kit)

- [ ] **Step 2.1: Replace `topic` column with `topics` jsonb in DB schema**

In `packages/db/src/schema/exams.ts`, replace line 1 with updated imports and line 18:

```typescript
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { user } from './users'
import {
  examSubjectEnum,
  examDifficultyEnum,
  reviewModeEnum,
  examStatusEnum,
} from './enums'

export const exams = pgTable('exams', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          text('user_id').notNull()
                     .references(() => user.id, { onDelete: 'cascade' }),
  title:           text('title').notNull(),
  subject:         examSubjectEnum('subject').notNull(),
  grade:           integer('grade').notNull(),
  difficulty:      examDifficultyEnum('difficulty').notNull(),
  topics:          jsonb('topics').$type<string[]>().notNull().default([]),
  reviewMode:      reviewModeEnum('review_mode').default('fast').notNull(),
  status:          examStatusEnum('status').default('draft').notNull(),
  schoolName:      text('school_name'),
  academicYear:    text('academic_year'),
  examType:        text('exam_type').default('TKA').notNull(),
  examDate:        text('exam_date'),
  durationMinutes: integer('duration_minutes'),
  instructions:    text('instructions'),
  classContext:    text('class_context'),
  discussionMd:    text('discussion_md'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

- [ ] **Step 2.2: Generate migration**

```bash
pnpm db:generate
```

Expected: creates a new file in `packages/db/migrations/` with `ALTER TABLE exams DROP COLUMN topic; ALTER TABLE exams ADD COLUMN topics jsonb DEFAULT '[]' NOT NULL;` (order may vary). Review the file to confirm it makes sense — it will DROP the old `topic` column (existing test data is lost, which is acceptable pre-launch).

- [ ] **Step 2.3: Run migration against local DB**

```bash
pnpm db:migrate
```

Expected: migration applies cleanly. If you have test exams in the DB, they will lose their `topic` field — recreate them after this task.

- [ ] **Step 2.4: Commit**

```bash
git add packages/db/src/schema/exams.ts packages/db/migrations/
git commit -m "feat(db): replace topic text column with topics jsonb array"
```

---

## Task 3: Update AI Prompt Builder

**Files:**
- Modify: `apps/api/src/lib/prompt.ts`
- Modify: `apps/api/src/lib/__test__/prompt.test.ts`

- [ ] **Step 3.1: Add failing tests for multi-topic prompt**

Append to `apps/api/src/lib/__test__/prompt.test.ts`:

```typescript
  it('injects topics list and even-distribution instruction in user message', () => {
    const { user } = buildExamPrompt({
      examType: 'sas',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topics: ['Teks Narasi', 'Puisi', 'Opini dan Fakta'],
      curriculumText: FAKE_CURRICULUM,
    })

    expect(user).toContain('Teks Narasi')
    expect(user).toContain('Puisi')
    expect(user).toContain('Opini dan Fakta')
    expect(user).toMatch(/distribusi.*merata|merata.*distribusi|setiap topik/i)
  })

  it('handles single topic identically to the old single-string contract', () => {
    const { user } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'mudah',
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      topics: ['Kosakata'],
      curriculumText: FAKE_CURRICULUM,
    })

    expect(user).toContain('Kosakata')
  })
```

- [ ] **Step 3.2: Run to verify failure**

```bash
cd apps/api && pnpm test src/lib/__test__/prompt.test.ts
```

Expected: FAIL — `BuildPromptInput` has no `topics` field; type error.

- [ ] **Step 3.3: Update `prompt.ts`**

Replace full `apps/api/src/lib/prompt.ts`:

```typescript
import type { ExamDifficulty, ExamType } from '@teacher-exam/shared'
import { EXAM_TYPE_PROFILE, resolveDifficultyDist } from './exam-type-profile'

export interface BuildPromptInput {
  examType: ExamType
  difficulty: ExamDifficulty
  subjectLabel: string
  grade: number
  /** 1–5 topics for the paper. AI distributes questions evenly across them. */
  topics: string[]
  /**
   * Full markdown corpus from `apps/api/src/curriculum/md/{subject}-kelas-{n}.md`
   * loaded via `getCurriculumText`. Becomes the baseline grounding in the
   * Claude system message — see RFC §9.
   */
  curriculumText: string
  classContext?: string | undefined
  exampleQuestions?: string | undefined
}

export interface BuiltPrompt {
  /** Sent as the Anthropic `system` field — baseline grounding + output rules. */
  system: string
  /** Sent as the user message text block — task-specific parameters. */
  user: string
}

/**
 * Assemble the two-part prompt for `/api/ai/generate`.
 *
 * - `system` carries the curriculum corpus, role, output rules, and the
 *   authority order (corpus = baseline, optional teacher PDF = additive).
 * - `user` carries only the per-request parameters (kelas, mapel, topik,
 *   jenis lembar, distribusi kesulitan, dst.) — the optional PDF is attached
 *   by the caller as a separate Claude `document` content block.
 *
 * Pure function — no IO. Mirrors RFC §9.
 */
export function buildExamPrompt(input: BuildPromptInput): BuiltPrompt {
  const profile = EXAM_TYPE_PROFILE[input.examType]
  const dist = resolveDifficultyDist(input.examType, input.difficulty)

  const system = [
    profile.promptPreamble,
    'Anda adalah generator soal ulangan SD untuk Kurikulum Merdeka Fase C (Kelas 5–6).',
    '',
    'Authority order:',
    '  1. Korpus Buku Siswa di bawah = baseline kurikulum (otoritatif untuk CP, daftar bab, sub-konsep, sample teks bacaan, dan kosakata).',
    '  2. PDF guru (jika ada di user message sebagai document block) = konteks tambahan untuk memperkaya soal — bukan pengganti korpus.',
    '',
    '--- KORPUS BUKU SISWA (Kurikulum Merdeka, Fase C) ---',
    input.curriculumText,
    '--- AKHIR KORPUS ---',
    '',
    'Output rules:',
    '- Jawab HANYA dengan JSON array berisi tepat 20 soal — tanpa prosa, tanpa pembungkus markdown.',
    '- Setiap soal punya field: text, option_a, option_b, option_c, option_d, correct_answer (a|b|c|d), topic, difficulty (mudah|sedang|sulit), cognitive_level (C1|C2|C3|C4).',
    `- Hormati distribusi kesulitan target dan level kognitif yang diizinkan untuk jenis lembar ini.`,
    `- Gaya soal: ${profile.stemHint}`,
  ].join('\n')

  const topicsLabel = input.topics.length === 1
    ? input.topics[0]
    : input.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const topicsInstruction = input.topics.length > 1
    ? `Distribusikan soal secara merata di antara semua topik (sekitar ${Math.round(20 / input.topics.length)} soal per topik). Setiap soal harus mencantumkan nama topiknya di field "topic".`
    : `Topik bersifat directive (fokus utama), bukan filter — Anda boleh mengambil konteks dari bab manapun di korpus selama relevan dengan topik.`

  const params: Record<string, unknown> = {
    kelas: input.grade,
    mata_pelajaran: input.subjectLabel,
    topik: topicsLabel,
    jenis_lembar: input.examType,
    distribusi_kesulitan: dist,
    level_kognitif: profile.cognitiveLevels,
  }
  if (input.classContext && input.classContext.trim() !== '') {
    params['konteks_guru'] = input.classContext.trim()
  }
  if (input.exampleQuestions && input.exampleQuestions.trim() !== '') {
    params['contoh_soal'] = input.exampleQuestions.trim()
  }

  const user = [
    'Buatkan satu lembar berisi 20 soal pilihan ganda berdasarkan parameter berikut.',
    topicsInstruction,
    'Jika ada PDF materi guru terlampir di pesan ini, gunakan sebagai sumber tambahan untuk konteks lokal/terkini.',
    '',
    JSON.stringify(params, null, 2),
  ].join('\n')

  return { system, user }
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
cd apps/api && pnpm test src/lib/__test__/prompt.test.ts
```

Expected: all tests pass (including the existing 3 + new 2).

- [ ] **Step 3.5: Commit**

```bash
git add apps/api/src/lib/prompt.ts apps/api/src/lib/__test__/prompt.test.ts
git commit -m "feat(api): prompt builder accepts topics array, emits even-distribution instruction"
```

---

## Task 4: Update AI Route

**Files:**
- Modify: `apps/api/src/routes/ai.ts`
- Modify: `apps/api/src/routes/__test__/ai.test.ts`

- [ ] **Step 4.1: Add failing test for multi-topic POST body**

In `apps/api/src/routes/__test__/ai.test.ts`, find where the existing `FAKE_AI_QUESTIONS` array and helper exist, then add a new `describe` block at the bottom:

```typescript
describe('POST /api/ai/generate — multi-topic', () => {
  it('accepts topics array and stores it in the exam row', async () => {
    const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
      })
    });
    (db.transaction as Mock).mockImplementation(mockTransaction)

    const mockSelect = makeChain({ rows: [makeExamRow({ topics: ['Teks Narasi', 'Puisi'] })] })
    ;(db.select as Mock).mockReturnValue(mockSelect)

    const app = new Hono()
    app.use('*', async (c, next) => { c.set('userId', 'test-user-id'); await next() })
    app.route('/api/ai', createAiRouter({ aiService: fakeAiService }))

    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'bahasa_indonesia',
        grade: 6,
        difficulty: 'campuran',
        topics: ['Teks Narasi', 'Puisi'],
        reviewMode: 'fast',
        examType: 'sas',
      }),
    })

    expect(res.status).toBe(201)
  })

  it('rejects body with old topic string field', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => { c.set('userId', 'test-user-id'); await next() })
    app.route('/api/ai', createAiRouter({ aiService: fakeAiService }))

    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'bahasa_indonesia',
        grade: 6,
        difficulty: 'campuran',
        topic: 'Teks Narasi',
        reviewMode: 'fast',
      }),
    })

    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 4.2: Run to verify failure**

```bash
cd apps/api && pnpm test src/routes/__test__/ai.test.ts
```

Expected: FAIL — `ai.ts` still uses `input.topic` (type error or runtime failure).

- [ ] **Step 4.3: Update `apps/api/src/routes/ai.ts`**

Replace the full file:

```typescript
import { Hono } from 'hono'
import { Schema } from 'effect'
import { db, exams, questions } from '@teacher-exam/db'
import {
  GenerateExamInputSchema,
  normalizeExamType,
  formatExamTitle,
  SUBJECT_LABEL,
} from '@teacher-exam/shared'
import { getCurriculumText } from '../lib/curriculum'
import { buildExamPrompt } from '../lib/prompt'
import { fetchExamWithQuestions } from '../lib/exams-query'
import {
  AiGenerationError,
  createDefaultAiService,
  type AiService,
  type GeneratedQuestion,
} from '../services/AiService'

/**
 * Build the `/api/ai` router. Accepts an injected `AiService` for tests; in
 * production the default service (using ANTHROPIC_API_KEY) is created lazily
 * so requests don't fail at import time when the key is missing.
 */
export function createAiRouter(opts: { aiService?: AiService } = {}): Hono {
  const router = new Hono()
  let aiService = opts.aiService

  router.post('/generate', async (c) => {
    const userId = c.get('userId') as string | undefined
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json().catch(() => null)
    if (body === null) return c.json({ error: 'Invalid JSON body' }, 400)

    const decode = Schema.decodeUnknownEither(GenerateExamInputSchema)
    const parsed = decode(body)
    if (parsed._tag === 'Left') {
      return c.json(
        { error: 'Validation failed', details: String(parsed.left) },
        400,
      )
    }
    const input = parsed.right

    const examType = normalizeExamType(input.examType ?? 'formatif')
    const curriculumText = await getCurriculumText(input.subject, input.grade)
    const { system, user } = buildExamPrompt({
      examType,
      difficulty: input.difficulty,
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      topics: input.topics,
      curriculumText,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions,
    })

    aiService ??= createDefaultAiService()

    let generatedQuestions: ReadonlyArray<GeneratedQuestion>
    try {
      generatedQuestions = await aiService.generate({ system, user })
    } catch (err) {
      if (err instanceof AiGenerationError) {
        return c.json({ error: 'AI generation failed', message: err.message }, 502)
      }
      throw err
    }

    const title = formatExamTitle({
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      examType,
      examDate: null,
      topics: input.topics,
    })
    const examId = crypto.randomUUID()
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(exams).values({
        id:          examId,
        userId,
        title,
        subject:     input.subject,
        grade:       input.grade,
        difficulty:  input.difficulty,
        topics:      input.topics,
        reviewMode:  input.reviewMode,
        status:      'draft',
        examType,
        classContext: input.classContext ?? null,
        createdAt:   now,
        updatedAt:   now,
      })

      await tx.insert(questions).values(
        generatedQuestions.map((q, i) => ({
          id:            crypto.randomUUID(),
          examId,
          number:        i + 1,
          text:          q.text,
          optionA:       q.option_a,
          optionB:       q.option_b,
          optionC:       q.option_c,
          optionD:       q.option_d,
          correctAnswer: q.correct_answer,
          topic:         q.topic ?? null,
          difficulty:    q.difficulty ?? null,
          status:        (input.reviewMode === 'fast' ? 'accepted' : 'pending') as 'accepted' | 'pending',
          createdAt:     now,
        })),
      )
    })

    const result = await fetchExamWithQuestions(examId)
    if (!result) {
      return c.json({ error: 'Failed to retrieve generated exam', code: 'DATABASE_ERROR' }, 500)
    }

    return c.json(result, 201)
  })

  return router
}
```

- [ ] **Step 4.4: Update the existing `makeExamRow` helper in `ai.test.ts` to use `topics`**

In `apps/api/src/routes/__test__/ai.test.ts`, find `makeExamRow` (around line 59) and change `topic: 'Teks Narasi',` to `topics: ['Teks Narasi'],`. Also update `FAKE_AI_QUESTIONS` array length check from `Array.from({ length: 20 }, ...)` — it stays 20, no change needed there.

- [ ] **Step 4.5: Run tests to verify they pass**

```bash
cd apps/api && pnpm test src/routes/__test__/ai.test.ts
```

Expected: all tests pass including the 2 new multi-topic ones.

- [ ] **Step 4.6: Run full API type-check**

```bash
cd apps/api && pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4.7: Commit**

```bash
git add apps/api/src/routes/ai.ts apps/api/src/routes/__test__/ai.test.ts
git commit -m "feat(api): pass topics array through AI route to DB and prompt builder"
```

---

## Task 5: Build `TopicMultiSelect` Component

**Files:**
- Create: `apps/web/src/components/generate/topic-multi-select.tsx`

The component uses `Popover` / `PopoverTrigger` / `PopoverContent` already exported from `packages/ui`. It renders selected topics as removable pills in the trigger and shows a scrollable checkbox list in the popover.

- [ ] **Step 5.1: Create the component**

Create `apps/web/src/components/generate/topic-multi-select.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@teacher-exam/ui'

interface TopicMultiSelectProps {
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
  /** "Lainnya (ketik sendiri)..." custom input handled by parent */
  onCustom?: () => void
  maxItems?: number
  placeholder?: string
}

export function TopicMultiSelect({
  options,
  selected,
  onChange,
  onCustom,
  maxItems = 5,
  placeholder = 'Pilih topik...',
}: TopicMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else if (selected.length < maxItems) {
      onChange([...selected, option])
    }
  }

  const remove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((s) => s !== option))
  }

  const isAtMax = selected.length >= maxItems

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={[
            'w-full min-h-[40px] px-3 py-2 rounded-sm border text-left',
            'flex flex-wrap gap-1.5 items-center',
            'bg-bg-surface border-border-ui',
            'hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400',
            'transition-colors duration-[120ms]',
          ].join(' ')}
        >
          {selected.length === 0 ? (
            <span className="text-text-tertiary text-sm flex-1">{placeholder}</span>
          ) : (
            selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 border border-primary-200 rounded-pill px-2 py-0.5 text-caption"
              >
                {s}
                <button
                  type="button"
                  onClick={(e) => remove(s, e)}
                  aria-label={`Hapus topik: ${s}`}
                  className="hover:text-primary-900"
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
          <ChevronDown size={16} className="ml-auto shrink-0 text-text-tertiary" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto"
        align="start"
      >
        <ul role="listbox" aria-multiselectable="true" className="py-1">
          {options.map((option) => {
            const checked = selected.includes(option)
            const disabled = !checked && isAtMax
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  disabled={disabled}
                  onClick={() => toggle(option)}
                  className={[
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                    'transition-colors duration-[80ms]',
                    disabled
                      ? 'text-text-tertiary cursor-not-allowed opacity-50'
                      : 'hover:bg-kertas-100 cursor-pointer',
                    checked ? 'text-primary-700 font-medium' : 'text-text-primary',
                  ].join(' ')}
                >
                  <span className={[
                    'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0',
                    checked
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-border-ui bg-bg-surface',
                  ].join(' ')}>
                    {checked ? <Check size={10} className="text-white" /> : null}
                  </span>
                  {option}
                </button>
              </li>
            )
          })}

          {onCustom ? (
            <li>
              <button
                type="button"
                onClick={() => { onCustom(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-secondary hover:bg-kertas-100 cursor-pointer border-t border-border-default mt-1"
              >
                Lainnya (ketik sendiri)...
              </button>
            </li>
          ) : null}
        </ul>

        {isAtMax ? (
          <p className="text-caption text-text-tertiary px-3 py-2 border-t border-border-default">
            Maksimal {maxItems} topik dipilih.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 5.2: Commit**

```bash
git add apps/web/src/components/generate/topic-multi-select.tsx
git commit -m "feat(web): TopicMultiSelect popover component with removable pill tokens"
```

---

## Task 6: Wire Multi-Select into Generate Form

**Files:**
- Modify: `apps/web/src/routes/_auth.generate.tsx`

- [ ] **Step 6.1: Replace `topik`/`customTopik` string state with `topiks: string[]`**

In the form state block (currently lines 188–193), make these changes:

```tsx
// Remove these two lines:
//   const [topik, setTopik] = useState<string>('')
//   const [customTopik, setCustomTopik] = useState<string>('')

// Add:
const [topiks, setTopiks] = useState<string[]>([])
const [customTopik, setCustomTopik] = useState<string>('')
const [showCustomInput, setShowCustomInput] = useState(false)
```

- [ ] **Step 6.2: Update derived values in the form**

Find the line `const effectiveTopik = topik === '__custom' ? customTopik : topik` (line 226) and replace with:

```tsx
const effectiveTopiks: string[] = showCustomInput && customTopik.trim() !== ''
  ? [...topiks, customTopik.trim()]
  : topiks
```

Find the sidebar completion count (line 229):

```tsx
const filledCount = [kelas, mapel, effectiveTopiks.length > 0 ? 'ok' : '', kesulitan, examType].filter(Boolean).length
```

- [ ] **Step 6.3: Update `runGenerate` payload**

In the `void api.ai.generate({...})` call (around line 249), change:

```tsx
// Remove:
//   topic: effectiveTopik,

// Add:
topics: effectiveTopiks,
```

Also update the `useCallback` dependency array: remove `effectiveTopik`, add `effectiveTopiks`.

- [ ] **Step 6.4: Add `TopicMultiSelect` import**

At the top of `_auth.generate.tsx`, after existing imports add:

```tsx
import { TopicMultiSelect } from '../components/generate/topic-multi-select.js'
```

- [ ] **Step 6.5: Replace the `Select` topik dropdown with `TopicMultiSelect`**

Find the topik `Select` block (lines 437–462). Replace the entire block:

```tsx
{/* Topik */}
<div className="space-y-2">
  <Label>Topik</Label>
  <TopicMultiSelect
    options={topikOptions}
    selected={topiks}
    onChange={setTopiks}
    onCustom={() => setShowCustomInput(true)}
    maxItems={5}
    placeholder="Pilih 1–5 topik..."
  />
  {showCustomInput ? (
    <div className="flex gap-2 mt-2">
      <Input
        placeholder="Ketik topik..."
        value={customTopik}
        onChange={(e) => setCustomTopik(e.target.value)}
        className="flex-1"
      />
      <button
        type="button"
        className="text-caption text-text-tertiary hover:text-danger-600"
        onClick={() => { setShowCustomInput(false); setCustomTopik('') }}
        aria-label="Batalkan topik kustom"
      >
        <X size={14} />
      </button>
    </div>
  ) : null}
  {effectiveTopiks.length === 0 ? (
    <p className="text-caption text-text-tertiary">Pilih minimal 1 topik.</p>
  ) : null}
</div>
```

- [ ] **Step 6.6: Update sidebar summary**

Find the sidebar "Topik" row (search for `exam.topic` or wherever the sidebar shows the current topic). Change it to display `effectiveTopiks.join(', ')` or truncated.

Look for the sidebar rendering — it uses a `RINGKASAN KONFIGURASI` card. Find the line that says something like `{effectiveTopik}` and replace with:

```tsx
{effectiveTopiks.length > 0
  ? effectiveTopiks.join(', ').slice(0, 60) + (effectiveTopiks.join(', ').length > 60 ? '…' : '')
  : '—'}
```

- [ ] **Step 6.7: Update generate button disabled guard**

Find where the generate button is disabled (usually checks `!effectiveTopik` or `filledCount < 5`). Update the topic check:

```tsx
disabled={isGenerating || !kelas || effectiveTopiks.length === 0}
```

- [ ] **Step 6.8: Remove `FokusGuruChips` dependency on single topik string**

`FokusGuruChips` receives `topik: string`. Change its call site to pass the first topic:

```tsx
<FokusGuruChips
  topik={effectiveTopiks[0] ?? ''}
  onAppend={(snippet) => setFokusGuru((prev) => prev + snippet)}
/>
```

- [ ] **Step 6.9: Run type-check on web package**

```bash
cd apps/web && pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 6.10: Commit**

```bash
git add apps/web/src/routes/_auth.generate.tsx
git commit -m "feat(web): replace single-topic Select with TopicMultiSelect in Generate form"
```

---

## Task 7: Update Print Preview Header

**Files:**
- Modify: `apps/web/src/routes/_auth.preview.tsx`

The `SoalSection` component passes a `metadata` object to `PaperHeader`. The exam `topics` array needs to be shown in the preview's info grid where the subject/kelas fields are.

- [ ] **Step 7.1: Find where the exam data feeds into preview metadata**

Search for where `metadata` is assembled in `_auth.preview.tsx` — it's where `exam.topic` (previously) would appear, inside the component that fetches the exam. Find the structure like:

```tsx
const metadata = {
  schoolName: exam.schoolName ?? '',
  academicYear: exam.academicYear ?? '',
  examType: exam.examType,
  examDate: exam.examDate ?? '',
  durationMinutes: exam.durationMinutes ?? 60,
  instructions: exam.instructions ?? '',
}
```

Add `topics` to the metadata type and construction:

```tsx
const metadata = {
  schoolName: exam.schoolName ?? '',
  academicYear: exam.academicYear ?? '',
  examType: exam.examType,
  examDate: exam.examDate ?? '',
  durationMinutes: exam.durationMinutes ?? 60,
  instructions: exam.instructions ?? '',
  topics: exam.topics,
}
```

- [ ] **Step 7.2: Thread `topics` into `SoalSection` → `PaperHeader`**

Update the `SoalSection` function signature to include `topics: string[]` in the `metadata` type. Then in `PaperHeader`, add a topics row in the info grid:

```tsx
{/* in the grid below Mata Pelajaran */}
<p className="col-span-2">
  Topik : <strong>{metadata.topics.join(' · ')}</strong>
</p>
```

Place this after the `<p>Mata Pelajaran : ...</p>` row.

- [ ] **Step 7.3: Run type-check**

```bash
cd apps/web && pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 7.4: Commit**

```bash
git add apps/web/src/routes/_auth.preview.tsx
git commit -m "feat(web): show topics joined with · in print preview paper header"
```

---

## Task 8: Update Dashboard Mini-Preview

**Files:**
- Modify: `apps/web/src/components/dashboard/mini-paper-preview.tsx`

The mini-preview is a tiny A4-scale thumbnail. Currently it shows `exam.examType` and other fields. We add a tiny topic indicator showing up to 2 topics + `+N`.

- [ ] **Step 8.1: Update mini-preview to show topics**

In `mini-paper-preview.tsx`, find the info grid section (around line 48–53). Add a topics line below the existing fields:

```tsx
{/* Topic row */}
<div className="col-span-2 text-[4px] text-text-tertiary truncate mt-0.5">
  {exam.topics.slice(0, 2).join(' · ')}
  {exam.topics.length > 2 ? ` +${exam.topics.length - 2}` : ''}
</div>
```

- [ ] **Step 8.2: Run type-check**

```bash
cd apps/web && pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 8.3: Commit**

```bash
git add apps/web/src/components/dashboard/mini-paper-preview.tsx
git commit -m "feat(web): mini-preview shows first 2 topics with +N overflow"
```

---

## Task 9: Full Integration Verification

- [ ] **Step 9.1: Run full monorepo type-check**

```bash
pnpm type-check
```

Expected: 0 errors across all packages.

- [ ] **Step 9.2: Run all tests**

```bash
pnpm test
```

Expected: all tests pass; no failures.

- [ ] **Step 9.3: Start dev servers**

```bash
pnpm dev
```

Expected: web on `:3000`, API on `:3001`, both start without errors.

- [ ] **Step 9.4: Browser verification (mandatory per CLAUDE.md)**

```bash
agent-browser open http://localhost:3000/generate && agent-browser wait --load networkidle && agent-browser snapshot -i
```

- [ ] **Step 9.5: Hook the console log capture**

```bash
agent-browser eval --stdin <<'EVALEOF'
(() => {
  const buf = (window.__agentLogs ||= []);
  if (!window.__agentLogsHooked) {
    window.__agentLogsHooked = true;
    for (const k of ['error', 'warn', 'log']) {
      const orig = console[k].bind(console);
      console[k] = (...a) => { buf.push({ k, a: a.map(String) }); orig(...a); };
    }
  }
  return buf;
})()
EVALEOF
```

- [ ] **Step 9.6: Drive the multi-topic happy path**

Using agent-browser, perform:
1. Select kelas 6
2. Select mata pelajaran (Bahasa Indonesia)
3. Open the topic multi-select → pick 3 topics (e.g. Teks Narasi, Puisi, Opini dan Fakta)
4. Verify 3 pills appear in the trigger
5. Verify sidebar summary shows all 3 topics
6. Remove one topic via its × button → verify 2 pills remain
7. Select exam type (UAS) and review mode (Cepat)
8. Submit generate (or verify the button becomes enabled with 2+ topics)

- [ ] **Step 9.7: Check console for errors**

```bash
agent-browser eval --stdin <<'EVALEOF'
window.__agentLogs
EVALEOF
```

Expected: empty array (no errors, warnings, or stray logs).

- [ ] **Step 9.8: Screenshot**

```bash
agent-browser screenshot .agent-browser/phase1-multi-topic-generate.png
```

- [ ] **Step 9.9: (If generate completes) Verify print preview header**

Open the preview for the newly generated exam. Verify the paper header shows all topic names joined with ` · `.

```bash
agent-browser screenshot .agent-browser/phase1-multi-topic-preview.png
```

- [ ] **Step 9.10: Verify existing single-topic flow is not broken**

Select only 1 topic and generate. Verify the paper works exactly as before. Screenshot:

```bash
agent-browser screenshot .agent-browser/phase1-single-topic-regression.png
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| 1–5 topics per exam | Task 1 schema, Task 5 maxItems=5 |
| Topics for TKA/UAS/UTS (not Latihan specifically — user can still choose any jenis with multiple topics) | Not explicitly restricted; max 5 applies globally — acceptable for Phase 1 |
| Even distribution instruction to AI | Task 3 prompt builder |
| Multi-select pill UI | Task 5 component + Task 6 form wire |
| Custom topic mixed with predefined | Task 6 (custom input appears alongside TopicMultiSelect) |
| Print header shows all topics | Task 7 |
| Dashboard mini-preview truncated | Task 8 |
| DB migration from single topic | Task 2 |
| Existing single-MCQ / single-topic flow unbroken | Task 9 regression test |
