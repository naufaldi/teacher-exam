# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

pnpm 10.15 + Turborepo monorepo. Node >= 22 required.

| Package | Role |
|---------|------|
| `apps/api` | Effect HttpApi server, Effect-TS service layers, better-auth (Google OAuth), `@effect/sql-drizzle` |
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
| Run migration | `pnpm db:migrate` (required after pulling new `exam_subject` enum values, e.g. Matematika) |
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

Required — core: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

AI (choose branch via `AI_PROVIDER`, default **`anthropic`**):

- **`AI_PROVIDER=anthropic`** (Anthropic Claude on `api.anthropic.com`): `ANTHROPIC_API_KEY`
- **`AI_PROVIDER=minimax`** (MiniMax via `@effect/ai-anthropic` compatible API): `MINIMAX_API_KEY`, `MINIMAX_ANTHROPIC_BASE_URL`, `AI_MODEL`, `AI_DISCUSSION_MODEL` (examples in `.env.example`). Keep `ANTHROPIC_API_KEY` set too for PDF generation, because MiniMax does not accept document inputs.
- **`AI_PROVIDER=openai`** (native OpenAI API via `openai` SDK): `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `AI_MODEL`, `AI_DISCUSSION_MODEL` (defaults `gpt-5.4-mini`). PDF materi uses OpenAI Responses API; no Claude fallback required for runtime flows.

Optional with defaults: `API_PORT` (3000), `WEB_PORT` (5173)

**Observability:** optional `OTEL_EXPORTER_OTLP_ENDPOINT` enables OpenTelemetry trace export (AI, DB spans via `@effect/opentelemetry` in `AppLayer`).

**API service layers** (`apps/api/src/layers/AppLayer.ts`): `AppConfig` (Effect Config for env), `AuthService` (better-auth boundary), `CurriculumService` (`@effect/platform` FileSystem), `DbClient`, AI layers, telemetry.

**Dev logging:** `AI_LOG=1` logs MiniMax/Claude timing (`[ai]` in API stdout); auto-on when `DEV_AUTH_ENABLED=true` or `NODE_ENV=development`. Web dev builds log `[dev] api.fetch` timing in the browser console via `devLog`.

**Curriculum validation:** `POST /api/ai/generate` does not run Penjaga Kurikulum; teachers trigger it from Review via `POST /api/exams/:id/validate-curriculum` (“Periksa kurikulum”).

## Critical Rules

- **Validation**: always use Effect Schema (never Zod — it is not installed)
- **Styling**: use project design tokens directly — never shadcn CSS variable conventions (`--background`, `--primary`, `--foreground`, etc.)
- **Auth**: better-auth with Google OAuth in production. Local dev may enable `DEV_AUTH_ENABLED` + `pnpm db:seed:dev` for one-click **Masuk Guru Dev** (`POST /api/dev/login`) — never enable in production.
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
- API service tests may use `@effect/vitest` (`it.effect`, `assert`) for Effect-native programs.
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

1. Make sure the dev servers are up (`pnpm dev`, web on `:5173`, api on `:3000`).
2. Drive the affected flow:
   ```bash
   agent-browser open http://localhost:5173/<route> && agent-browser wait --load networkidle && agent-browser snapshot -i
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
12. **MUST** use the platform-specific `runMain` (`NodeRuntime.runMain`, `BrowserRuntime.runMain`) for any standalone long-running Effect program. The HttpApi bridge entrypoint is exempt because it owns the Node HTTP request lifecycle.

### Runtime version

Production and CI pin **`effect@3.21.2`** (see root `package.json` `pnpm.overrides`). Use [effect.website](https://effect.website/docs/code-style/guidelines/) and `effect-solutions` against **v3** APIs. The optional v4 clone under `~/.local/share/effect-solutions/effect` is reference-only.

### Error model (two tiers)

| Layer | Pattern | Location |
|-------|---------|----------|
| HTTP responses | `Schema.TaggedError` + `HttpApiSchema.annotations({ status })` | `apps/api/src/api/errors/http.ts` |
| Domain / services | `Data.TaggedError` | `apps/api/src/errors/`, service modules |

### Import policy

| Package | Rule |
|---------|------|
| Root `effect` | Named imports from `"effect"` only — no `effect/*` deep paths, no `flow`, no `import * as` |
| `@effect/platform`, `@effect/sql` | Subpath namespace imports (enforced by `@effect/no-import-from-barrel-package` in ESLint) |

### Lint and CI workflow

Before push or PR:

```bash
pnpm lint && pnpm effect:check && pnpm type-check && pnpm test
```

| Command | Purpose |
|---------|---------|
| `pnpm lint` | `@effect/eslint-plugin` dprint + import rules |
| `pnpm effect:check` | AGENTS-only rules (flow, Match, client bundle guards) |
| `pnpm type-check` | Turbo type-check all packages |
| `pnpm test` | Vitest across packages |

IDE: use workspace TypeScript (`.vscode/settings.json`) and `@effect/language-service` diagnostics configured in `tsconfig.base.json`.

Key language-service severities (error): `floatingEffect`, `missingStarInYieldEffectGen`, `globalConsoleInEffect`, `globalFetchInEffect`.

<!-- effect-solutions:start -->
## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `~/.local/share/effect-solutions/effect` for real implementations

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns — check the guide first.
<!-- effect-solutions:end -->

## Local Effect Source

The Effect v4 repository is cloned to `~/.local/share/effect-solutions/effect` for optional deep reference.
Runtime code targets **Effect v3.21.2**; do not assume v4 APIs without checking the installed version.

## Cursor Cloud specific instructions

### Infrastructure (not in `pnpm dev`)

- **PostgreSQL 16** must be running before API/E2E. This VM uses the distro package (`postgresql` on Ubuntu), not Docker. Start with `sudo pg_ctlcluster 16 main start` if needed.
- Create role/DB once (matches `.env.example`): user `school_exam`, password `change-me`, database `school_exam`.
- Copy `.env.example` → `.env`. For local E2E without Google OAuth, enable `DEV_AUTH_ENABLED`, `VITE_DEV_AUTH`, dev email/password, then `pnpm db:seed:dev` after migrate.

### Migrations gotcha

`pnpm db:migrate` (`drizzle-kit migrate`) can exit **1** on a fresh DB because migration `0008_clean_leopardon.sql` repeats `ADD VALUE 'matematika'` after `0007` already added it. Workaround (no repo edits): copy `packages/db/src/migrations` to a temp folder, remove the first line of `0008_clean_leopardon.sql`, then run the migrator from `apps/api`:

```bash
cp -a packages/db/src/migrations /tmp/te-migrations
tail -n +2 packages/db/src/migrations/0008_clean_leopardon.sql > /tmp/te-migrations/0008_clean_leopardon.sql
cd apps/api && node --env-file-if-exists=../../.env --import tsx/esm -e "
import pg from 'pg'; import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await migrate(drizzle(c), { migrationsFolder: '/tmp/te-migrations' });
await c.end();
console.log('migrate ok');
"
```

### Dev servers

- `pnpm dev` (root) kills stale ports then starts API **:3000** and web **:5173** in parallel. Prefer **tmux** for long-running dev (`ujian-dev` or similar).
- Vite binds to `localhost`; use `http://localhost:5173` (not `127.0.0.1`) if a health check returns connection refused.
- API health: `curl http://localhost:3000/api/health`. Dev login: `POST http://localhost:3000/api/dev/login` (requires `DEV_AUTH_ENABLED`).

### Verify / CI commands

See the **Commands** and **Lint and CI workflow** sections above: `pnpm lint`, `pnpm effect:check`, `pnpm type-check`, `pnpm test` (use `pnpm exec turbo run test` if `pnpm test` has no script at root).
