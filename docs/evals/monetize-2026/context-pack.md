# Context pack — allowlist for generators

**Visibility:** generator-visible  
**Rule:** You may read **only** the paths listed below (plus this folder’s `theme-brief.md`, the active `prompts/*.md`, and any `baselines/*` present on your branch).  
**Do not** search for, open, or follow links into: `EVAL-PLAN.md`, `rubrics/`, `judge/`, `scores/`, `WRITEUP.md`, rival `artifacts/`, or other candidates’ branches.

---

## Product orientation (read these)

| Path | Why |
|------|-----|
| `docs/PRD-v2-final.md` | Core product PRD (style + scope of Ujian SD) |
| `docs/PRD-v8-generate-pdf-enhancement.md` | Recent PRD style / phased features |
| `docs/ROADMAP.md` | Milestones and what already shipped |
| `AGENTS.md` | Stack conventions (Effect, monorepo, testing) |

## RFC style examples (read 1–2)

| Path | Why |
|------|-----|
| `docs/rfc/2026-06-29-generate-pdf-enhancement-rfc.md` | Architecture RFC shape |
| `docs/rfc/2026-06-25-bab-materi-picker-rfc.md` | Shorter RFC example |

## Code seams relevant to monetize (skim as needed)

| Path | Why |
|------|-----|
| `packages/shared/src/schemas/api.ts` | API contracts |
| `packages/shared/src/schemas/entities.ts` | Entity schemas |
| `packages/db/src/schema/` | Drizzle tables |
| `apps/api/src/layers/AppLayer.ts` | Service layers |
| `apps/api/src/api/handlers/` | HTTP handlers pattern |
| `apps/web/src/routes/_auth.generate.tsx` | Generate UX entry |
| `apps/web/src/lib/api/` | Web API client patterns |

## Auth / session (if gating by user)

| Path | Why |
|------|-----|
| Search only under `apps/api` for `better-auth` / session middleware already used by the app | Do not invent a parallel auth system |

## Explicitly forbidden for generators

- `docs/evals/monetize-2026/EVAL-PLAN.md`
- `docs/evals/monetize-2026/rubrics/**`
- `docs/evals/monetize-2026/judge/**`
- `docs/evals/monetize-2026/scores/**`
- `docs/evals/monetize-2026/WRITEUP.md`
- Other model result branches’ artifacts
- Broad “explore the whole repo” without need

If a path is not on this allowlist and not `theme-brief` / active prompt / `baselines/`, do not open it.
