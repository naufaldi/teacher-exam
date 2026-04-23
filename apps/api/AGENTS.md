@../../AGENTS.md

# @teacher-exam/api — Hono API Server

## Required Skills

Before implementing or refactoring backend code, **read the matching skill file IMMEDIATELY** (do not just mention it). Skills live under `~/.agents/skills/<name>/SKILL.md`.

| When you are about to... | Read first |
|---|---|
| Write/refactor any Effect-TS service, Layer, Schema, or tagged error | `effect-ts-expert` |
| Write or modify tests | `test-driven-development` |
| Debug a failing test, runtime error, or unexpected behavior | `systematic-debugging` |

## Project Structure

```
src/
  index.ts          # entrypoint: middleware, route mounting
  routes/           # Hono sub-app modules
  layers/           # Effect-TS service layers (DbLayer, AppLayer)
  errors/           # Data.TaggedError definitions
  middleware/       # Hono middleware (requireAuth, etc.)
  lib/              # auth config, AI client, utilities
```

## Hono Route Pattern

Create a sub-app and export it; mount in `index.ts`:

```ts
// src/routes/exams.ts
const router = new Hono()
router.get('/', requireAuth, async (c) => { ... })
export { router as examsRouter }

// src/index.ts
app.route('/api/exams', examsRouter)
```

Auth routes are handled by better-auth:
```ts
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))
```

## Effect-TS Service Layers

Services use `Context.Tag` → `Layer.succeed` → compose in `AppLayer`:

```ts
// Define service
class DbClient extends Context.Tag('DbClient')<DbClient, Db>() {}
// Create layer
export const DbLayer = Layer.succeed(DbClient, db)
// Compose (src/layers/AppLayer.ts)
export const AppLayer = DbLayer
```

## Typed Errors

All domain errors use `Data.TaggedError`. Existing errors in `src/errors/index.ts`:

| Class | Fields |
|-------|--------|
| `DatabaseError` | `cause: unknown` |
| `NotFoundError` | `resource: string, id: string` |
| `UnauthorizedError` | _(none)_ |
| `AiGenerationError` | `cause: unknown` |
| `PdfParseError` | `cause: unknown` |
| `ValidationError` | `message: string` |

Add new errors by extending `Data.TaggedError('ErrorName')<{ ... }>`.

## Auth Middleware

`requireAuth` in `src/middleware/auth.ts` validates the session via better-auth and injects `userId` into Hono context:

```ts
// Usage on a router
router.use(requireAuth)
// Access in handler
const userId = c.get('userId') // string
```

`ContextVariableMap` is augmented in `src/lib/auth.ts` so `c.get('userId')` is type-safe.

## Import Conventions

- Extensionless relative imports (Bundler resolution; tsx handles runtime)
- Workspace packages without extension: `import { db } from '@teacher-exam/db'`

## Testing

Follow the root **Testing & TDD** rule: failing test first, watch it fail, then implement.

- **Location**: `src/<area>/__test__/<file>.test.ts` — mirrored per module.
  - `src/routes/__test__/exams.test.ts`
  - `src/layers/__test__/AppLayer.test.ts`
  - `src/middleware/__test__/auth.test.ts`
- **Stack**: Vitest. Route-level tests use Hono's in-process `app.request()` (no network). Service/layer tests run Effect programs with `Effect.runPromise(program.pipe(Effect.provide(TestLayer)))`.
- **What to test**: every route handler (auth required + happy path + each `Data.TaggedError` branch), every service method, every middleware, every `Schema` round-trip.
- **Fakes over mocks**: swap `DbLayer` for `Layer.succeed(DbClient, fakeDb)`; do not mock Drizzle calls individually.

### TDD Checklist

1. Write the test in `__test__/` describing the expected behavior (status code, body shape, error tag).
2. Run `pnpm test <file>` and confirm it fails for the right reason.
3. Implement the minimal route/service code to pass.
4. Re-run; confirm green and no regressions.
5. Refactor while staying green.

### Pattern: Hono Route Test

```ts
import { Hono } from 'hono'
import { examsRouter } from '../exams'

test('GET /api/exams returns 401 without session', async () => {
  const app = new Hono().route('/api/exams', examsRouter)
  const res = await app.request('/api/exams')
  expect(res.status).toBe(401)
})
```

### Pattern: Effect Service Test (Layer swap)

```ts
import { Effect, Layer } from 'effect'
import { DbClient } from '../../layers/DbLayer'
import { listExams } from '../exams.service'

test('listExams returns rows from DbClient', async () => {
  const fakeDb = { query: { exams: { findMany: async () => [{ id: 'exam_1' }] } } }
  const TestLayer = Layer.succeed(DbClient, fakeDb as never)
  const result = await Effect.runPromise(listExams.pipe(Effect.provide(TestLayer)))
  expect(result).toEqual([{ id: 'exam_1' }])
})
```

## Effect Rules (API)

Inherits the root **Effect-TS Code Style (Mandatory)** rules. API-specific additions:

1. **MUST** follow the root Effect-TS Code Style rules.
2. **MUST NOT** use tacit style or `flow`.
3. **MUST** wrap every Drizzle/database call inside an `Effect.tryPromise` that maps the failure to a `DatabaseError` (or a more specific `Data.TaggedError`).
4. **MUST** register every new service tag inside `AppLayer`.
