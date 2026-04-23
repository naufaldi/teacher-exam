@../../AGENTS.md

# @teacher-exam/shared — Shared Schemas & Types

Single source of truth for API contracts used by both `@teacher-exam/api` and `@teacher-exam/web`.

## Project Structure

```
src/
  index.ts              # barrel re-exports
  schemas/
    primitives.ts       # enum literals (ExamSubject, ExamDifficulty, etc.)
    entities.ts         # entity schemas (User, Exam, Question, PdfUpload)
    api.ts              # API input/output schemas + response type aliases
```

## Effect Schema Patterns

This project uses Effect Schema exclusively. Never use Zod.

```ts
import { Schema } from 'effect'

// Enum literals
const ExamSubjectSchema = Schema.Literal('bahasa_indonesia', 'pendidikan_pancasila')
type ExamSubject = typeof ExamSubjectSchema.Type

// Entity struct
const UserSchema = Schema.Struct({
  id:    Schema.String,
  name:  Schema.String,
  email: Schema.String,
})
type User = typeof UserSchema.Type

// Nullable field
Schema.NullOr(Schema.String)

// Optional field (may be omitted — for API inputs)
Schema.optional(Schema.String)

// Bounded integer
Schema.Int.pipe(Schema.between(5, 6))

// Required non-empty text
Schema.NonEmptyString

// Extend/spread a struct
Schema.Struct({ ...ExamSchema.fields, questions: Schema.Array(QuestionSchema) })
```

## Adding Schemas

1. New enum/literal → `primitives.ts`
2. New entity → `entities.ts` (import primitives as needed)
3. New API input or response type → `api.ts`
4. If adding a new file → re-export from `src/index.ts`
5. Always export both the Schema and its inferred `Type`

## Export Convention

This package ships raw TypeScript — no build step:

```json
"exports": { ".": "./src/index.ts" }
```

Consumers import directly:

```ts
import { ExamSchema, type Exam } from '@teacher-exam/shared'
```

Use `.js` extensions in all relative imports within this package (NodeNext resolution).

## Schema Rules

Inherits the root **Effect-TS Code Style (Mandatory)** rules. Schema-specific additions:

1. **MUST** follow the root Effect-TS Code Style rules.
2. **MUST** brand all new entity ID schemas (`UserId`, `ExamId`, `QuestionId`, ...).
3. **MUST NOT** use `flow` or tacit combinators inside schema definitions.
4. **MUST** export both the Schema constant and its inferred `Type`.
