# Design: Initialize agents.md + CLAUDE.md Symlinks

**Date:** 2026-04-22
**Status:** Draft

## Problem

No AI agent guidance files exist in the repository. Claude Code and other AI tools have no project-specific context when working in sub-packages, leading to incorrect assumptions (e.g., using Zod instead of Effect Schema, shadcn CSS vars instead of project tokens).

## Solution

Create layered `agents.md` files with Claude Code include directives (`@../../agents.md`) so root conventions cascade into package-specific guidance. Filesystem symlinks (`CLAUDE.md -> agents.md`) provide dual-tool compatibility.

## Files

| File | Purpose |
|------|---------|
| `/agents.md` | Root — architecture, commands, TS conventions, env, critical rules |
| `/apps/api/agents.md` | Hono patterns, Effect-TS layers, auth middleware |
| `/apps/web/agents.md` | TanStack Router, Tailwind v4 tokens, React best practices (Vercel rules subset) |
| `/packages/shared/agents.md` | Effect Schema patterns, file organization, adding schemas |
| `CLAUDE.md` (x4) | Symlinks to `agents.md` at each location |

## Root agents.md Content

- Architecture overview (5 packages, roles)
- Commands table (dev, build, type-check, db:generate, db:migrate, db:studio, standalone dev)
- TypeScript conventions (TS 6, strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess, ESM .js extensions, bracket notation process.env)
- Environment setup (root .env, --env-file-if-exists, required vars)
- Critical rules: Effect Schema only, project design tokens only

## apps/api/agents.md Content

Starts with `@../../agents.md` include.

- Hono route module pattern (sub-apps, mounting, auth route handler)
- Effect-TS service layers (Context.Tag -> Layer.succeed -> AppLayer composition)
- Typed errors (Data.TaggedError — 6 existing error classes)
- Auth middleware (requireAuth -> userId on context)
- Import conventions (.js extensions, workspace imports)

## apps/web/agents.md Content

Starts with `@../../agents.md` include.

- TanStack Router file-based routing (__root.tsx, _prefix layouts, beforeLoad guards)
- API client (apiFetch wrapper, credentials: include, /api proxy)
- Styling rules (Tailwind v4 @theme blocks, project tokens, NEVER shadcn CSS vars, color scales, fonts)
- UI components (@teacher-exam/ui imports, CVA variants, asChild pattern)
- React best practices (Vercel skill key rules, ~15 summarized):
  - Bundle: direct imports, dynamic import(), defer third-party
  - Re-renders: no inline components, hoist default props, derive state in render, functional setState, startTransition, refs for transient values
  - Client fetching: deduplicate listeners, passive scroll listeners
  - Rendering: ternary not &&, extract static JSX

## packages/shared/agents.md Content

Starts with `@../../agents.md` include.

- Effect Schema patterns (Literal, Struct, NullOr, optional, between, NonEmptyString, Struct spread)
- File organization (primitives.ts -> entities.ts -> api.ts)
- Adding schemas workflow (5 steps)
- Export convention (raw TS, no build, .js extensions)

## Symlink Strategy

Filesystem symlinks (`ln -s agents.md CLAUDE.md`) at all 4 locations. Relative same-directory symlinks for portability.

## Out of Scope

- packages/db/agents.md and packages/ui/agents.md (future candidates)
- Testing conventions (no test infrastructure exists yet)
- CI/CD configuration

## Verification

1. `cat CLAUDE.md` at each level prints agents.md content
2. `ls -la CLAUDE.md` shows symlink arrow
3. `head -1 apps/api/agents.md` shows `@../../agents.md`
4. `pnpm type-check` still passes (no code changes)
