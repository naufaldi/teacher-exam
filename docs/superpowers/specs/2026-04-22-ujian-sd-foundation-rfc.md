# RFC: Ujian SD — Foundation Architecture

> **Status:** Proposed | **Date:** 2026-04-22 | **Author:** Design System Handoff + PRD v2

---

## 1. Overview

**Ujian SD** is a web application that helps Indonesian elementary school teachers (Guru SD Kelas 5–6) generate, review, print, and grade 20-question multiple-choice exam sheets aligned with Kurikulum Merdeka Fase C. All UI copy is in Bahasa Indonesia. The primary output is a printable A4 TKA-format exam document.

**Hackathon scope (MVP):** Login → Generate → Review → Preview/Print → Quick Grading → History.

**Target demo:** 2026-04-26.

---

## 2. Tech Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| **Monorepo** | pnpm workspaces + Turborepo | Fast install, workspace hoisting, incremental build cache |
| **Backend** | Hono + Effect TS | Hono: lightweight, edge-ready, great TypeScript. Effect: typed errors, DI via Layer, composable async |
| **Frontend** | Vite + React 19 + TanStack Router v1 | File-based type-safe routing, fast dev server |
| **Database** | PostgreSQL + Drizzle ORM | Type-safe SQL, migration tooling, great pnpm monorepo support |
| **Auth** | better-auth (Google OAuth) | First-class Hono adapter, session management, PostgreSQL adapter |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Design tokens map 1:1 to Tailwind v4 `@theme`, shadcn for accessible primitives |
| **AI** | Anthropic Claude API (`claude-opus-4-6`) | Exam generation, curriculum validation, discussion generator |
| **PDF parsing** | `pdf-parse` (Node.js) | Extract text from uploaded reference PDFs |

---

## 3. Monorepo Structure

```
teacher-exam/
├── apps/
│   ├── web/                         # Vite + React 19 + TanStack Router
│   │   ├── src/
│   │   │   ├── routes/              # TanStack Router file-based routes
│   │   │   │   ├── __root.tsx       # Root layout (nav, auth check)
│   │   │   │   ├── index.tsx        # /  → Login page
│   │   │   │   ├── _auth.tsx        # Auth layout wrapper (redirect if unauthenticated)
│   │   │   │   ├── _auth.dashboard.tsx
│   │   │   │   ├── _auth.generate.tsx
│   │   │   │   ├── _auth.review.$examId.tsx
│   │   │   │   ├── _auth.confirm.$examId.tsx  # Fast Track confirmation
│   │   │   │   ├── _auth.preview.$examId.tsx
│   │   │   │   ├── _auth.grading.$examId.tsx
│   │   │   │   └── _auth.history.tsx
│   │   │   ├── components/          # App-specific components (not shared)
│   │   │   ├── lib/
│   │   │   │   ├── api.ts           # Typed fetch client (calls apps/api)
│   │   │   │   └── auth.ts          # better-auth client
│   │   │   ├── app.css              # @import tailwindcss + design tokens
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                         # Hono + Effect TS
│       ├── src/
│       │   ├── routes/              # Hono route handlers (thin — call services)
│       │   │   ├── auth.ts          # better-auth handler
│       │   │   ├── exams.ts
│       │   │   ├── questions.ts
│       │   │   ├── pdf-uploads.ts
│       │   │   └── ai.ts            # /generate, /validate, /discuss
│       │   ├── services/            # Effect services (business logic)
│       │   │   ├── ExamService.ts
│       │   │   ├── QuestionService.ts
│       │   │   ├── AiService.ts
│       │   │   └── PdfService.ts
│       │   ├── layers/              # Effect Layer implementations
│       │   │   ├── DbLayer.ts       # Drizzle db client
│       │   │   └── AppLayer.ts      # Composed root layer
│       │   ├── errors/              # Tagged Effect errors
│       │   │   └── index.ts
│       │   ├── middleware/
│       │   │   └── auth.ts          # Session validation middleware
│       │   └── index.ts             # Hono app entry point
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── db/                          # Drizzle schema + client (shared between api and scripts)
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── exams.ts
│   │   │   │   ├── questions.ts
│   │   │   │   ├── pdf-uploads.ts
│   │   │   │   └── index.ts         # re-export all tables
│   │   │   ├── client.ts            # drizzle(postgres(env.DATABASE_URL))
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                          # Shared component library
│   │   ├── src/
│   │   │   ├── components/          # shadcn primitives, customized to design system
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── design-tokens.css        # Copied from design system handoff
│   │   ├── tailwind.css             # @theme tokens for Tailwind v4
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                      # Types + Effect Schemas (used by both api and web)
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── exam.ts          # Schema.Struct for Exam, Question, etc.
│       │   │   └── index.ts
│       │   ├── types/
│       │   │   └── index.ts         # Pure TypeScript types inferred from schemas
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── assets/                          # Design system assets (copied from handoff)
│   ├── logo-mark.svg
│   ├── logo-wordmark.svg
│   ├── logo-horizontal.svg
│   ├── kop-stamp.svg
│   └── pattern-paper.svg
│
├── docs/
│   ├── PRD-v2-final.md
│   └── superpowers/
│       ├── specs/                   ← this file
│       └── plans/
│
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 4. Package Responsibilities

### `packages/shared`

Owns all **data shapes** visible across the API boundary. Uses Effect Schema for runtime validation — types are inferred, not hand-written.

```typescript
// Subject, grade, difficulty enums
// Exam, Question, PdfUpload, User — schema definitions
// API request/response shapes
```

**Rule:** No runtime dependencies except `effect`. No server-only or browser-only code.

### `packages/db`

Owns the **database schema and client**. Drizzle table definitions are the single source of truth for the DB shape.

**Rule:** Only `apps/api` imports `@teacher-exam/db`. Never imported by `apps/web`.

### `packages/ui`

Owns the **design tokens and accessible component primitives**. Tailwind v4 `@theme` maps directly to the design system handoff tokens. shadcn components are reskinned to the Ujian SD palette.

**Rule:** No business logic. No API calls. Pure presentation.

### `apps/api`

Owns the **HTTP surface and business logic**. Hono routes are thin — they validate input (via shared schemas), call Effect services, and return HTTP responses. All stateful logic lives in services.

**Rule:** `Effect.runPromise()` only in route handlers, never inside services. Services return `Effect<A, E>`.

### `apps/web`

Owns the **user interface**. TanStack Router provides typed navigation and loader pattern for data fetching. Components use `packages/ui` primitives, customized per-surface.

**Rule:** No direct DB access. All data via `apps/api`.

---

## 5. Database Schema

### Enums

```typescript
// packages/db/src/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core'

export const examSubjectEnum = pgEnum('exam_subject', [
  'bahasa_indonesia',
  'pendidikan_pancasila',
])
export const examDifficultyEnum = pgEnum('exam_difficulty', [
  'mudah', 'sedang', 'sulit', 'campuran',
])
export const reviewModeEnum = pgEnum('review_mode', ['fast', 'slow'])
export const examStatusEnum = pgEnum('exam_status', ['draft', 'final'])
export const questionStatusEnum = pgEnum('question_status', [
  'pending', 'accepted', 'rejected',
])
export const answerEnum = pgEnum('answer', ['a', 'b', 'c', 'd'])
```

### `users`

```typescript
// packages/db/src/schema/users.ts
export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  googleId:  text('google_id').unique().notNull(),
  name:      text('name').notNull(),
  email:     text('email').unique().notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### `exams`

```typescript
// packages/db/src/schema/exams.ts
export const exams = pgTable('exams', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull()
                     .references(() => users.id, { onDelete: 'cascade' }),
  title:           text('title').notNull(),
  subject:         examSubjectEnum('subject').notNull(),
  grade:           integer('grade').notNull(),         // 5 or 6
  difficulty:      examDifficultyEnum('difficulty').notNull(),
  topic:           text('topic').notNull(),
  reviewMode:      reviewModeEnum('review_mode').default('fast').notNull(),
  status:          examStatusEnum('status').default('draft').notNull(),
  // Metadata (filled during review / fast-track)
  schoolName:      text('school_name'),
  academicYear:    text('academic_year'),              // '2025/2026'
  examType:        text('exam_type').default('TKA').notNull(),
  // Literal union (validated in shared schema, not PG enum):
  //   'latihan' | 'formatif' | 'sts' | 'sas' | 'tka'
  // Steers AI generation via EXAM_TYPE_PROFILE (see §9). Legacy 'TKA' (uppercase)
  // accepted at read-time and normalized to 'tka'. See PRD §8.6.
  examDate:        text('exam_date'),
  durationMinutes: integer('duration_minutes'),
  instructions:    text('instructions'),
  // Hackathon extras (nullable, non-breaking if absent)
  classContext:    text('class_context'),              // Feature 2: adaptive difficulty
  discussionMd:    text('discussion_md'),              // Feature 3: discussion generator
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### `questions`

```typescript
// packages/db/src/schema/questions.ts
export const questions = pgTable('questions', {
  id:               uuid('id').primaryKey().defaultRandom(),
  examId:           uuid('exam_id').notNull()
                      .references(() => exams.id, { onDelete: 'cascade' }),
  number:           integer('number').notNull(),        // 1–20
  text:             text('text').notNull(),
  optionA:          text('option_a').notNull(),
  optionB:          text('option_b').notNull(),
  optionC:          text('option_c').notNull(),
  optionD:          text('option_d').notNull(),
  correctAnswer:    answerEnum('correct_answer').notNull(),
  topic:            text('topic'),
  difficulty:       text('difficulty'),
  status:           questionStatusEnum('status').default('pending').notNull(),
  // Hackathon Feature 1: Curriculum Validator badges
  validationStatus: text('validation_status'),          // 'valid' | 'needs_review' | 'invalid'
  validationReason: text('validation_reason'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### `pdf_uploads`

```typescript
// packages/db/src/schema/pdf-uploads.ts
export const pdfUploads = pgTable('pdf_uploads', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').notNull()
                   .references(() => users.id, { onDelete: 'cascade' }),
  examId:        uuid('exam_id')
                   .references(() => exams.id, { onDelete: 'set null' }),
  fileName:      text('file_name').notNull(),
  fileSize:      integer('file_size').notNull(),        // bytes
  extractedText: text('extracted_text'),
  uploadedAt:    timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt:     timestamp('expires_at', { withTimezone: true }).notNull(), // +7 days
})
```

---

## 6. API Routes

All routes prefixed `/api`. Session cookie validated by better-auth middleware on all `/api/*` except `/api/auth/*`.

### Auth

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET/POST` | `/api/auth/*` | better-auth | All OAuth callbacks, session CRUD |

### Exams

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/exams` | List authenticated user's exams, sorted by `created_at` desc |
| `POST` | `/api/exams` | Create exam skeleton (before generation) |
| `GET` | `/api/exams/:id` | Get exam + questions |
| `PATCH` | `/api/exams/:id` | Update metadata (school name, date, status, etc.) |
| `DELETE` | `/api/exams/:id` | Delete exam + cascade questions |

### Questions

| Method | Path | Description |
|---|---|---|
| `PATCH` | `/api/questions/:id` | Update status (accepted/rejected), edit text or options |

### AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/generate` | Generate 20 questions for an exam (streams or returns JSON) |
| `POST` | `/api/ai/validate` | Run curriculum validator on exam questions (Hackathon Feat 1) |
| `POST` | `/api/ai/discuss` | Generate discussion/explanations for finalized exam (Hackathon Feat 3) |

### PDF Uploads

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/pdf-uploads` | Upload PDF, extract text, store in db |
| `DELETE` | `/api/pdf-uploads/:id` | Delete upload |

---

## 7. Effect TS Pattern

Services are interfaces defined with `Context.Tag`. Implementations are `Layer.succeed`. Routes call `Effect.runPromise()`.

### Tagged Errors

```typescript
// apps/api/src/errors/index.ts
import { Data } from 'effect'

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  cause: unknown
}> {}

export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  resource: string
  id: string
}> {}

export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{}> {}

export class AiGenerationError extends Data.TaggedError('AiGenerationError')<{
  cause: unknown
}> {}

export class PdfParseError extends Data.TaggedError('PdfParseError')<{
  cause: unknown
}> {}
```

### Service Pattern

```typescript
// apps/api/src/services/ExamService.ts
import { Effect, Context, Layer } from 'effect'
import { db } from '@teacher-exam/db'
import { exams, questions } from '@teacher-exam/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { DatabaseError, NotFoundError } from '../errors'

export class ExamService extends Context.Tag('ExamService')<
  ExamService,
  {
    list: (userId: string) => Effect.Effect<typeof exams.$inferSelect[], DatabaseError>
    get:  (id: string, userId: string) => Effect.Effect<
            typeof exams.$inferSelect & { questions: typeof questions.$inferSelect[] },
            DatabaseError | NotFoundError
          >
    create: (data: typeof exams.$inferInsert) => Effect.Effect<
              typeof exams.$inferSelect,
              DatabaseError
            >
    patch: (id: string, userId: string, data: Partial<typeof exams.$inferInsert>) =>
             Effect.Effect<typeof exams.$inferSelect, DatabaseError | NotFoundError>
    remove: (id: string, userId: string) => Effect.Effect<void, DatabaseError | NotFoundError>
  }
>() {}

export const ExamServiceLive = Layer.succeed(ExamService, {
  list: (userId) =>
    Effect.tryPromise({
      try: () =>
        db.select().from(exams)
          .where(eq(exams.userId, userId))
          .orderBy(desc(exams.createdAt)),
      catch: (e) => new DatabaseError({ cause: e }),
    }),

  get: (id, userId) =>
    Effect.tryPromise({
      try: async () => {
        const [exam] = await db.select().from(exams)
          .where(and(eq(exams.id, id), eq(exams.userId, userId)))
        if (!exam) throw new Error('not_found')
        const qs = await db.select().from(questions)
          .where(eq(questions.examId, id))
          .orderBy(questions.number)
        return { ...exam, questions: qs }
      },
      catch: (e) =>
        e instanceof Error && e.message === 'not_found'
          ? new NotFoundError({ resource: 'exam', id })
          : new DatabaseError({ cause: e }),
    }),

  create: (data) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db.insert(exams).values(data).returning()
        return row!
      },
      catch: (e) => new DatabaseError({ cause: e }),
    }),

  patch: (id, userId, data) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db.update(exams)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(exams.id, id), eq(exams.userId, userId)))
          .returning()
        if (!row) throw new Error('not_found')
        return row
      },
      catch: (e) =>
        e instanceof Error && e.message === 'not_found'
          ? new NotFoundError({ resource: 'exam', id })
          : new DatabaseError({ cause: e }),
    }),

  remove: (id, userId) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.delete(exams)
          .where(and(eq(exams.id, id), eq(exams.userId, userId)))
        if (result.rowCount === 0) throw new Error('not_found')
      },
      catch: (e) =>
        e instanceof Error && e.message === 'not_found'
          ? new NotFoundError({ resource: 'exam', id })
          : new DatabaseError({ cause: e }),
    }),
})
```

### Route Handler Pattern

```typescript
// apps/api/src/routes/exams.ts
import { Hono } from 'hono'
import { Effect } from 'effect'
import { ExamService, ExamServiceLive } from '../services/ExamService'
import { NotFoundError } from '../errors'

export const examsRouter = new Hono()

examsRouter.get('/', async (c) => {
  const userId = c.get('userId') as string
  const result = await Effect.runPromise(
    Effect.provide(
      ExamService.pipe(Effect.flatMap(svc => svc.list(userId))),
      ExamServiceLive,
    ).pipe(
      Effect.catchTag('DatabaseError', (e) => {
        console.error(e.cause)
        return Effect.fail(e)
      }),
    ),
  )
  return c.json(result)
})
```

---

## 8. Auth Flow (better-auth + Google OAuth)

```
Browser                     apps/api                   Google OAuth
   │                            │                           │
   │  GET /api/auth/sign-in/    │                           │
   │  google                    │                           │
   │───────────────────────────►│                           │
   │                            │  redirect 302             │
   │◄───────────────────────────│                           │
   │                            │                           │
   │  GET accounts.google.com   │                           │
   │───────────────────────────────────────────────────────►│
   │◄───────────────────────────────────────────────────────│
   │  POST /api/auth/callback/  │                           │
   │  google?code=...           │                           │
   │───────────────────────────►│                           │
   │                            │  exchange code            │
   │                            │───────────────────────────►│
   │                            │◄───────────────────────────│
   │                            │  upsert user in DB         │
   │                            │  set session cookie        │
   │  redirect to /dashboard    │                           │
   │◄───────────────────────────│                           │
```

**Session cookie:** `__session` — HttpOnly, Secure, SameSite=Lax, 30-day expiry.

**Auth middleware** (`apps/api/src/middleware/auth.ts`): reads `__session`, validates with better-auth, puts `userId` in Hono context. Returns 401 on invalid/missing session.

---

## 9. AI Integration

### Claude API Call — Generate 20 Questions

**Model:** `claude-opus-4-6`

#### Exam Type Profile (steering table)

Setiap nilai `examType` (PRD §8.6) memiliki *profil asesmen* yang menentukan distribusi kesulitan default, level kognitif Bloom yang diizinkan, dan gaya stem soal. Tabel ini hidup di `apps/api/src/lib/exam-type-profile.ts` dan di-resolve oleh prompt builder.

```typescript
type ExamTypeProfile = {
  difficultyDist:  { mudah: number; sedang: number; sulit: number }  // dari 20 soal
  cognitiveLevels: ReadonlyArray<'C1' | 'C2' | 'C3' | 'C4'>          // Bloom diizinkan
  stemHint:        string                                            // 1 kalimat gaya soal
  promptPreamble:  string                                            // 1-2 kalimat framing
  kopLabel:        string                                            // dicetak di kop lembar
}

export const EXAM_TYPE_PROFILE: Record<ExamType, ExamTypeProfile> = {
  latihan:  { difficultyDist: { mudah: 8, sedang: 8,  sulit: 4 }, cognitiveLevels: ['C1','C2','C3'], ... },
  formatif: { difficultyDist: { mudah: 6, sedang: 10, sulit: 4 }, cognitiveLevels: ['C1','C2','C3'], ... },
  sts:      { difficultyDist: { mudah: 6, sedang: 10, sulit: 4 }, cognitiveLevels: ['C1','C2','C3'], ... },
  sas:      { difficultyDist: { mudah: 4, sedang: 10, sulit: 6 }, cognitiveLevels: ['C2','C3','C4'], ... },
  tka:      { difficultyDist: { mudah: 3, sedang: 9,  sulit: 8 }, cognitiveLevels: ['C2','C3','C4'], ... },
}
```

**Rationale — kenapa structured (bukan tone-only):**
- *Konsisten & terukur* — distribusi & level kognitif di-enforce per jenis; bisa di-audit post-generation.
- *Defensible secara pedagogis* — selaras dengan kerangka asesmen Kurmer yang minta variasi level kognitif.
- *Maintainable* — satu mapping table, satu titik tuning. Nambah jenis baru = 1 row.
- *Lebih aman dari "full template"* — tidak overload prompt dengan instruksi yang bisa tabrakan (mis. "C4 tapi mudah").

**Override manual:** jika user pilih `difficulty` eksplisit (`'mudah'|'sedang'|'sulit'`), `difficultyDist` profil di-bypass; kalau pilih `'campuran'` (default), pakai distribusi profil.

#### System prompt (assembled at runtime)

```
{profile.promptPreamble}
Mata Pelajaran: {subjectLabel}. Kelas: {grade} SD. Topik: {topic}.
Kurikulum: Merdeka Fase C.

Distribusi kesulitan target (dari 20 soal): mudah {dist.mudah}, sedang {dist.sedang}, sulit {dist.sulit}.
Level kognitif yang diizinkan (Bloom): {profile.cognitiveLevels.join(', ')}.
Gaya soal: {profile.stemHint}

[Hardcoded CP/TP text for the subject from PRD §8.1 / §8.2]
{classContext ? `Konteks/Fokus guru: ${classContext}` : ''}
{exampleQuestions ? `Contoh gaya soal yang diinginkan: ${exampleQuestions}` : ''}
{extractedPdfText if present}

Jawab dalam format JSON array berisi 20 soal. Setiap soal punya field:
text, option_a..d, correct_answer, topic, difficulty, cognitive_level (C1..C4).
```

**Response schema:**
```typescript
type GeneratedQuestion = {
  number: number          // 1–20
  text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'a' | 'b' | 'c' | 'd'
  topic: string
  difficulty: 'mudah' | 'sedang' | 'sulit'
  cognitive_level?: 'C1' | 'C2' | 'C3' | 'C4'  // baru — opsional di MVP, validator post-gen di fase polish
}
```

**Validation:** After parsing, confirm `array.length === 20`, all fields non-empty, `correct_answer` ∈ {a,b,c,d}. Invalid items trigger Fast Track → Slow Track fallback per PRD. Validator distribusi (count actual vs target ± 20%) defer ke fase polish.

---

## 10. Design System Integration

Design tokens live in `packages/ui/tailwind.css` (Tailwind v4 `@theme` block). This is a direct copy from the design handoff's `tailwind.css`.

```css
/* apps/web/src/app.css */
@import "tailwindcss";
@import "@teacher-exam/ui/tailwind.css";

/* Theming presets (data-bg, data-font) are included in the import above */
```

**Token → Utility mapping (key examples):**

| Design token | Tailwind utility |
|---|---|
| `--color-primary-600` (`#B42318` Merah Ujian) | `bg-primary-600`, `text-primary-600` |
| `--color-kertas-50` (app background) | `bg-kertas-50` |
| `--color-bg-app` | `bg-bg-app` |
| `--color-success-fg` | `text-success-fg` |
| `--text-h1` | `text-h1` |
| `--font-sans` (Plus Jakarta Sans) | `font-sans` |
| `--font-serif` (Lora — print only) | `font-serif` |
| `--radius-md` | `rounded-md` |
| `--shadow-md` | `shadow-md` |

**shadcn customization:** `packages/ui` uses shadcn components initialized with `--style=default` then tokens overridden to match design system. `globals.css` maps shadcn's `--background`, `--primary`, `--destructive`, etc. to design token values.

**Print styles:** Exam print output uses `font-serif` (Lora), 2cm margins, A4 portrait. `@media print` block hides nav, buttons, sidebar. Questions use 2-column grid via CSS columns.

---

## 11. Frontend Data Flow

```
TanStack Router loader (route file)
         │
         ▼
    lib/api.ts (typed fetch)
         │
         ▼
    apps/api (Hono route)
         │
         ▼
   Effect service
         │
         ▼
  packages/db (Drizzle)
         │
         ▼
    PostgreSQL
```

**Loader pattern (TanStack Router):**
```typescript
// apps/web/src/routes/_auth.dashboard.tsx
export const Route = createFileRoute('/_auth/dashboard')({
  loader: async () => {
    const exams = await api.exams.list()
    return { exams }
  },
  component: DashboardPage,
})
```

**No React Query for MVP** — TanStack Router's built-in loader + `invalidate()` is sufficient for hackathon scope.

---

## 12. Environment Variables

```bash
# .env (apps/api)
DATABASE_URL=postgresql://user:pass@localhost:5432/teacher_exam
ANTHROPIC_API_KEY=sk-ant-...
BETTER_AUTH_SECRET=random-32-char-string
BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
PDF_UPLOAD_DIR=/tmp/teacher-exam-uploads   # local dev; use object storage in prod

# .env (apps/web)
VITE_API_URL=http://localhost:3001
```

---

## 13. Non-Goals (RFC Scope)

The following are **explicitly out of scope** for this RFC / Foundation phase:

- Mobile layout (PRD §6: desktop-first, print required)
- Export to DOCX/PDF file (browser print is sufficient)
- Batch scoring (client-side only per PRD)
- K13 curriculum (Merdeka Fase C only)
- Bank Soal (Phase 2)
- Student-facing online exam
- Multi-language support

---

## 14. Open Questions

| # | Question | Decision |
|---|---|---|
| 1 | PDF storage backend (local fs vs S3) | Local fs for hackathon; env var `PDF_UPLOAD_DIR`; swap to S3 post-hackathon |
| 2 | Rate limiting for AI generation | In-memory per-IP limiter (10 req/hr) via Hono middleware for hackathon |
| 3 | Session expiry strategy | better-auth default (30 days sliding) |
| 4 | Deployment target | Vercel (web) + Railway (api + postgres) — post-hackathon decision |

---

## 15. Key Design Constraints (from Design System README)

- **No backdrop blur** — paper aesthetic, not glass
- **No colored left-border-only cards** — anti-slop rule
- **No gradients** in UI chrome (one subtle login hero gradient allowed)
- **No illustration characters** — only the logo mark and kop stamp
- **No emoji in production copy** — Lucide icons carry visual load
- **Hover:** `color-mix(in oklab, <color> 85%, black)` for button darkening
- **Focus ring:** 3px outline `--color-border-focus` at 40% opacity, 2px offset
- **Border radius:** 4 (chips/inputs), 8 (buttons), 12 (cards), 16 (modal), 999 (pill)
- **Shadows:** three levels, all warm-tinted with `rgba(26,20,16,…)`
- **Motion:** max 400ms, `cubic-bezier(0.4,0.0,0.2,1)`, no bounces
