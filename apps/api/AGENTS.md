@../../AGENTS.md

# @teacher-exam/api — Hono API Server

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

## Effect Rules (API)

Inherits the root **Effect-TS Code Style (Mandatory)** rules. API-specific additions:

1. **MUST** follow the root Effect-TS Code Style rules.
2. **MUST NOT** use tacit style or `flow`.
3. **MUST** wrap every Drizzle/database call inside an `Effect.tryPromise` that maps the failure to a `DatabaseError` (or a more specific `Data.TaggedError`).
4. **MUST** register every new service tag inside `AppLayer`.
