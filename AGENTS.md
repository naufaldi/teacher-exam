# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

pnpm 10.15 + Turborepo monorepo. Node >= 22 required.

| Package | Role |
|---------|------|
| `apps/api` | Hono v4 REST API, Effect-TS service layers, better-auth (Google OAuth), Drizzle ORM |
| `apps/web` | React 19 + Vite 8 + TanStack Router (file-based) + Tailwind CSS v4 |
| `packages/shared` | Effect Schema validation contracts — single source of truth for API types |
| `packages/db` | Drizzle ORM PostgreSQL schemas + migrations |
| `packages/ui` | Radix UI + CVA + tailwind-merge component library |

## Commands

| Task | Command |
|------|---------|
| Dev all (parallel) | `pnpm dev` |
| Build all | `pnpm build` |
| Type-check all | `pnpm type-check` |
| Generate migration | `pnpm db:generate` |
| Run migration | `pnpm db:migrate` |
| DB studio | `cd packages/db && pnpm drizzle-kit studio` |
| Dev API only | `cd apps/api && node --env-file-if-exists=../../.env --watch --import tsx/esm src/index.ts` |
| Dev web only | `cd apps/web && pnpm vite --port 5173` |

## TypeScript Conventions

- TypeScript 6, target ES2022, module `ESNext`, moduleResolution `Bundler`
- Strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` enabled
- Always use bracket notation for env: `process.env['KEY']` (returns `string | undefined`)
- ESM only — use extensionless relative imports (resolved by Vite / tsx / Bundler module resolution)
- All packages use `"type": "module"`

## Environment Variables

Single `.env` at repo root (gitignored). API loads it via `--env-file-if-exists=../../.env` (Node flag).

Required: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`

Optional with defaults: `API_PORT` (3001), `WEB_PORT` (3000)

## Critical Rules

- **Validation**: always use Effect Schema (never Zod — it is not installed)
- **Styling**: use project design tokens directly — never shadcn CSS variable conventions (`--background`, `--primary`, `--foreground`, etc.)
- **Auth**: better-auth with Google OAuth only — no username/password auth
- **Token usage (RTK)**: RTK hooks are active for Claude Code and Cursor — Bash calls are auto-rewritten, do not wrap them manually. Built-in `Read` / `Grep` / `Glob` bypass the hook; for large outputs use shell equivalents or `rtk read` / `rtk grep` / `rtk find`.

  Preferred command map (let the hook rewrite — do not prefix `rtk` yourself):

  | Native command | RTK-rewritten form | Why |
  |---|---|---|
  | `git status` / `git diff` / `git log` | `rtk git …` | -75 to -92% |
  | `git add` / `commit` / `push` / `pull` | `rtk git …` | collapses to one-line `ok …` |
  | `pnpm type-check` (any `tsc`) | `rtk tsc` | errors grouped by file (-80%) |
  | `pnpm test` / `vitest` | `rtk vitest` | failures only (-90%) |
  | `pnpm lint` / `eslint` / `biome` | `rtk lint` | grouped by rule/file |
  | `pnpm list` / dep tree | `rtk pnpm list` | compact tree |
  | `ls`, `tree`, `find`, `cat`, `rg` | `rtk ls` / `find` / `read` / `grep` | use when bypassing built-in `Read`/`Grep`/`Glob` |
  | `pnpm prisma generate` (future) | `rtk prisma generate` | strips ASCII art |

  Verify with `rtk init --show` and inspect savings via `rtk gain`.

## Effect-TS Code Style (Mandatory)

These rules are enforceable across `apps/api`, `apps/web`, `packages/shared`, and any future Effect-using package. Reference: https://effect.website/docs/code-style/guidelines/

1. **MUST** import Effect modules as named namespace imports from the root: `import { Effect, Schema, Layer, Context, Data, Match, Either, Option, pipe } from 'effect'`. **MUST NOT** use deep paths (`effect/Effect`, `effect/Function`) or `import * as`.
2. **MUST NOT** use tacit / point-free style. Always pass an explicit lambda: write `Effect.map((x) => fn(x))`, never `Effect.map(fn)`.
3. **MUST NOT** import or use `flow` from `effect/Function`. Compose with explicit lambdas or `pipe`.
4. **MUST** use `Effect.gen(function* () { ... })` whenever a pipeline has 3+ steps or any branching. **MUST NOT** chain nested `Effect.flatMap` / `Effect.andThen` calls when a generator is clearer.
5. **MUST** use `pipe(value, op1, op2)` or `value.pipe(op1, op2)` for short (≤2 step) transformations.
6. **MUST** model all domain errors with `Data.TaggedError('Name')<{ ... }>`. **MUST NOT** `throw` inside an `Effect` or return `Promise.reject` from Effect-bearing code.
7. **MUST** discriminate tagged unions with `Match.value(x).pipe(Match.tag(...), Match.exhaustive)`. **MUST NOT** use `switch` on `_tag` without exhaustiveness enforcement.
8. **MUST** validate every external input/output with Effect Schema. **MUST NOT** install or import Zod, Yup, Valibot, io-ts, or any other validator.
9. **MUST** define the Schema first, then derive the type via `type X = typeof XSchema.Type`, and export both.
10. **MUST** declare services with `Context.Tag` and provide them via `Layer.succeed` / `Layer.effect`, composed inside `apps/api/src/layers/AppLayer.ts`.
11. **MUST** brand all new entity primary-key schemas via `Schema.String.pipe(Schema.brand('XId'))`.
12. **MUST** use the platform-specific `runMain` (`NodeRuntime.runMain`, `BrowserRuntime.runMain`) for any standalone long-running Effect program. The existing Hono `serve()` entrypoint is exempt because Hono owns the request lifecycle.
