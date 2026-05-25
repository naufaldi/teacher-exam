# @teacher-exam/api — Effect HttpApi Server

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
  index.ts              # bridge server: better-auth + HttpApi toWebHandler
  api/
    definition.ts       # HttpApi.make + groups + /api prefix
    server.ts           # Layer composition
    groups/             # endpoint definitions
    handlers/           # HttpApiBuilder.group implementations
    middleware/         # Authorization + rate-limit HttpApiMiddleware
    services/           # DbClient + AiClient tags
    bridge/             # Node http bridge + routing
  errors/               # Data.TaggedError for services
  api/errors/http.ts    # Schema.TaggedError for HTTP responses
  lib/                  # auth, AI, prompts, utilities
```

## HttpApi Handler Pattern

Define endpoints in `api/groups/`, implement in `api/handlers/`:

```ts
export const HealthLive = HttpApiBuilder.group(TeacherExamApi, 'health', (handlers) =>
  handlers.handle('getHealth', () =>
    Effect.succeed({ status: 'ok', service: 'teacher-exam-api', timestamp: new Date().toISOString() }),
  ),
)
```

Protected groups attach middleware in the group definition:

```ts
HttpApiGroup.make('me').middleware(Authorization).middleware(GlobalRateLimit)
```

## Auth Middleware

`Authorization` in `src/api/middleware/auth.ts` validates sessions via better-auth and provides `CurrentUser`:

```ts
const { userId } = yield* CurrentUser
```

## Testing

Tests use `HttpApiBuilder.toWebHandler()` via `src/api/__test__/test-harness.ts`:

```ts
import { buildHttpApiTestApp } from '../routes/__test__/http-api-setup'

const app = buildHttpApiTestApp({ userId: 'test-user-id', aiService: fakeAi })
const res = await app.request('/api/exams')
expect(res.status).toBe(200)
```

Mirror tests under `src/<area>/__test__/` or `src/routes/__test__/` for route families.

## Effect Rules (API)

Inherits the root **Effect-TS Code Style (Mandatory)** rules. API-specific additions:

1. **MUST** follow the root Effect-TS Code Style rules.
2. **MUST NOT** use tacit style or `flow`.
3. **MUST** use `DbClient` from `api/services/db.ts` for all Drizzle access; map queries with `runDb()` in `api/lib/db-effect.ts` (maps `SqlError` → `ApiDatabaseError`). Use `SqlClient.withTransaction` for transactions — not `db.transaction()`.
4. **MUST** register service tags in `api/server.ts` Layer composition.
