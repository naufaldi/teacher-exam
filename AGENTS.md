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

## Testing & TDD (Mandatory)

Every new feature, bugfix, or behavior change follows **Test-Driven Development**. Read `~/.agents/skills/test-driven-development/SKILL.md` before writing code.

**Iron rule:** No production code without a failing test first. Cycle: **RED** (write failing test) → verify it fails for the right reason → **GREEN** (minimal code to pass) → verify it passes → **REFACTOR** (keep green).

### Test Runner

- **Vitest** for every package (web, api, shared, ui). ESM-native, single config style.
- Invoke via `pnpm test` (RTK auto-rewrites to `rtk vitest` per the table above — failures-only output).
- Test glob: `**/__test__/**/*.test.{ts,tsx}` (Vitest default).

### File Location Convention

Tests live in a `__test__/` folder next to the code they cover (mirrored per module, frontend and backend):

| Package | Source | Test |
|---------|--------|------|
| `apps/web` | `src/routes/_auth.dashboard.tsx` | `src/routes/__test__/_auth.dashboard.test.tsx` |
| `apps/web` | `src/lib/api.ts` | `src/lib/__test__/api.test.ts` |
| `apps/api` | `src/routes/exams.ts` | `src/routes/__test__/exams.test.ts` |
| `apps/api` | `src/layers/AppLayer.ts` | `src/layers/__test__/AppLayer.test.ts` |
| `apps/api` | `src/middleware/auth.ts` | `src/middleware/__test__/auth.test.ts` |
| `packages/*` | `src/<area>/<file>.ts` | `src/<area>/__test__/<file>.test.ts` |

Exclude `**/__test__/**` from production `tsconfig` `include` (or add to `exclude`).

### Coverage Expectation

Every new function, route, hook, component, or `Layer` ships with at least one test that was observed failing first. Bug fixes ship with a regression test that reproduced the bug before the fix.

### Effect-TS Testing Note

Prefer real `Layer` composition over mocks. Provide test layers via `Layer.succeed(Tag, fakeImpl)` and run with `Effect.runPromise(program.pipe(Effect.provide(TestLayer)))`. Mock only at true I/O boundaries (network, filesystem, time, RNG).

### Browser Verification (Mandatory after each frontend task)

After finishing any task that touches the running app (route, component, form, API call), verify it end-to-end with **agent-browser** before declaring done. Read `~/.agents/skills/agent-browser/SKILL.md` first.

Required loop per finished task:

1. Make sure the dev servers are up (`pnpm dev`, web on `:3000`, api on `:3001`).
2. Drive the affected flow:
   ```bash
   agent-browser open http://localhost:3000/<route> && agent-browser wait --load networkidle && agent-browser snapshot -i
   ```
3. Capture console errors and warnings — they fail the task:
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
   Re-run the flow, then re-eval `window.__agentLogs` to inspect.
4. Take a screenshot of the final state for the change record:
   ```bash
   agent-browser screenshot .agent-browser/<task-slug>.png
   ```
5. **Fix every console error/warning surfaced** (including stray `console.log` left from debugging) and any failed network request in the snapshot. Re-run the loop until clean.

A task is **not done** until: tests are green, the browser flow completes without console errors/warnings, and there are no leftover `console.log` calls in the diff.

## Production

**Live URLs** (no secrets here — this file is public):

| Service | URL |
|---|---|
| Web | https://ujian-sekolah.faldi.xyz |
| API | https://api-ujian-sekolah.faldi.xyz |
| API health | https://api-ujian-sekolah.faldi.xyz/api/health |

Full operational reference (architecture decisions, deploy commands, bug history, gotchas) → **`docs/ops/PRODUCTION.md`**

### Secret hygiene (open-source repo — mandatory)

- **NEVER** write secrets, passwords, API keys, or VPS credentials into any committed file (`AGENTS.md`, `CLAUDE.md`, `DEPLOY.md`, source code, Dockerfiles, compose files).
- Production secrets live in `.env.production` on the VPS only — that file is gitignored and never committed.
- Use `.env.production.example` (committed) as the public template — it lists variable **names** with placeholder values only.
- If you need to inspect or update a secret: `ssh vps-faldi 'cat ~/projects/teacher-exam/.env.production'` — read it on the server, do not paste values into conversation or files.

### Key deployment facts (no secrets)

- **Infrastructure:** Caddy reverse-proxy (`edge-proxy-caddy`) on VPS `103.59.160.70`, reads Docker labels, auto-issues Let's Encrypt certs.
- **Domains:** Cloudflare subdomains of `faldi.xyz` — DNS-only or Proxied, both work.
- **Runtime:** API runs via `node --import tsx/esm src/index.ts` (no tsc build). WORKDIR must be `/app/apps/api` so pnpm-scoped `tsx` resolves.
- **Vite bake:** `VITE_API_URL` is baked into the JS bundle at Docker build time. Domain changes require `--build web`.
- **Auth redirect:** `callbackURL` in `signIn.social()` must be an **absolute URL** (`window.location.origin + '/dashboard'`), not relative — or better-auth resolves it against the API host.
- Compose file: `docker-compose.prod.yml`. Env file: `.env.production` (on VPS, not in repo).

### Update flow

```bash
# After git push to main:
ssh vps-faldi 'cd ~/projects/teacher-exam && git pull && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build'
```

---

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
