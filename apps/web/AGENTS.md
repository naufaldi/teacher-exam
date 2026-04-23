@../../AGENTS.md

# @teacher-exam/web — React Frontend

## Required Skills

Before implementing or refactoring frontend code, **read the matching skill file IMMEDIATELY** (do not just mention it). Skills live under `~/.agents/skills/<name>/SKILL.md`.

| When you are about to... | Read first |
|---|---|
| Write/refactor any React component, hook, or data fetch | `vercel-react-best-practices` |
| Design a flexible/reusable component API (props, slots, context) | `vercel-composition-patterns` |
| Reach for `useEffect` — first check if it's necessary | `writing-react-effects` |
| Touch any Effect-TS code (Schema, Either, Match, etc.) | `effect-ts-expert` |
| Write or modify tests | `test-driven-development` + `frontend-testing` |
| Verify a finished task in the running app (post-implementation gate) | `agent-browser` |

**Effect-TS preference:** wherever a new code path crosses an I/O boundary (API calls, storage, URL params) or models a state machine (loading/success/error, wizard steps), prefer Effect primitives — `Schema` for validation, `Either` for fallible results, `Option` for absence, `Match` for discriminated unions, `Data.TaggedError` for errors — over ad-hoc `try/catch`, `null` sentinels, or `switch` statements. See the existing **Effect on the Client (Rules)** section below for the hard constraints.

## Project Structure

```
src/
  routes/           # TanStack Router file-based routes
  lib/api.ts        # typed API client (fetch wrapper)
  app.css           # global styles + design token imports
vite.config.ts      # Vite + React + Tailwind + TanStack Router plugins
```

## TanStack Router (File-Based Routing)

Routes live in `src/routes/` and are auto-discovered. `routeTree.gen.ts` is generated — do not edit it.

| File pattern | Meaning |
|---|---|
| `__root.tsx` | Root layout with `<Outlet />` |
| `index.tsx` | `/` route |
| `_auth.tsx` | Pathless layout (auth guard) wrapping all `_auth.*.tsx` routes |
| `_auth.dashboard.tsx` | `/dashboard` (protected) |

`beforeLoad` in `_auth.tsx` checks session and redirects to `/` if unauthenticated.

Route exports use named `Route` const (not default export):
```ts
export const Route = createFileRoute('/dashboard')({ component: Dashboard })
```

## API Client

`src/lib/api.ts` — typed `apiFetch` wrapper, always `credentials: 'include'`:

```ts
api.health.get()
api.exams.list()
api.exams.get(id)
api.exams.patch(id, body)
api.exams.remove(id)
```

Base path is `/api`. In dev, Vite proxies `/api` → `http://localhost:3001`.

## Styling — Tailwind CSS v4

**Tailwind v4 uses `@theme {}` blocks in CSS, NOT `tailwind.config.js`.**

```css
/* correct v4 usage */
@import "tailwindcss";
@theme { --color-primary-600: oklch(...); }
```

### Token Rules (Critical)

- **Use project tokens**: `bg-primary-600`, `text-kertas-700`, `border-border-default`
- **NEVER use shadcn CSS variable conventions**: `--background`, `--primary`, `--foreground`, `bg-background`, `text-foreground`, etc. — these are not defined in this project
- Design tokens are defined in `packages/ui/tailwind.css` under `@theme {}`

### Color Scales

| Scale | Meaning |
|---|---|
| `primary-*` | Red (brand) |
| `secondary-*` | Green |
| `accent-*` | Gold |
| `kertas-*` | Warm neutral (paper) |
| `success-*` / `danger-*` / `warning-*` / `info-*` | Status colors |

### Semantic Utilities

`bg-app`, `bg-surface`, `bg-muted`, `text-primary`, `text-secondary`, `text-tertiary`, `border-default`, `border-ui`

### Typography

- `font-sans` → Plus Jakarta Sans
- `font-serif` → Lora
- `font-mono` → JetBrains Mono

## UI Components

Import from `@teacher-exam/ui`:

```ts
import { Button, Card, Badge, Dialog, Input, Label, Select } from '@teacher-exam/ui'
```

Components use CVA variants: `<Button variant="primary" size="md">`.
`asChild` prop (Radix Slot) for composable rendering.

## React Best Practices (Vercel Rules — Vite SPA Subset)

### Bundle Optimization (Critical)
- Import directly from source modules — avoid barrel file re-exports that pull in unused code
- Use `import()` dynamic imports for heavy components not needed on initial load
- Defer third-party scripts (analytics, logging) — load after hydration via `requestIdleCallback`

### Re-render Prevention (Medium)
- Never define components inside other components (no inline component definitions)
- Hoist non-primitive default props to module level to avoid new references on every render
- Derive state during render instead of syncing via `useEffect`
- Use functional `setState` for stable callbacks: `setX(prev => prev + 1)`
- Pass a function to `useState` for expensive initial values: `useState(() => compute())`
- Use `startTransition` for non-urgent state updates (keeps input responsive)
- Use `useRef` for transient, frequently-changing values (mouse position, scroll offset)

### Rendering
- Use ternary for conditional rendering — not `&&` (avoids rendering `0` or `false`)
- Extract static JSX outside component functions to avoid re-creation on every render
- Use passive event listeners for scroll/touch: `{ passive: true }`

### Client Data Fetching
- Deduplicate global event listeners — avoid adding the same listener multiple times

## Testing

Follow the root **Testing & TDD** rule: write the failing test first, watch it fail, then implement.

- **Location**: `src/<area>/__test__/<file>.test.tsx` (e.g. `src/routes/__test__/_auth.dashboard.test.tsx`, `src/lib/__test__/api.test.ts`).
- **Stack**: Vitest + `@testing-library/react` + `@testing-library/user-event` + `jsdom`.
- **What to test**: route components (render + user interaction), hooks (behavior, not implementation), `apiFetch` calls (validate the response with `Schema.decodeUnknownEither`), and any `Match`-based UI state machine.
- **Do not test**: generated files (`routeTree.gen.ts`), third-party UI internals.

### TDD Checklist

1. Write the test in `__test__/` describing the expected behavior.
2. Run `pnpm test <file>` and confirm it fails for the right reason.
3. Implement the minimal code to pass.
4. Re-run; confirm green and no regressions.
5. Refactor while staying green.
6. **Browser verify** — run the affected route in `agent-browser`, confirm zero console errors/warnings and no stray `console.log`. See **Browser Verification** in the root AGENTS.md.

### Pattern: Route Component Test

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from '../_auth.dashboard'

test('shows empty state when no exams', async () => {
  render(<Route.options.component />)
  expect(await screen.findByText(/no exams yet/i)).toBeInTheDocument()
})
```

### Pattern: API Client Test (Schema-validated)

```ts
import { Schema, Either } from 'effect'
import { ExamSchema } from '@teacher-exam/shared'

test('exams.list decodes server response', () => {
  const raw = [{ id: 'exam_1', title: 'Math' }]
  const decoded = Schema.decodeUnknownEither(Schema.Array(ExamSchema))(raw)
  expect(Either.isRight(decoded)).toBe(true)
})
```

## Effect on the Client (Rules)

Inherits the root **Effect-TS Code Style (Mandatory)** rules. Client-specific additions:

1. **MUST** use `Schema.decodeUnknownEither` to validate every API response before consuming it.
2. **MUST** model client-side success/failure with `Either` and absent values with `Option`. **MUST NOT** use `null`/`undefined` sentinels in new code paths that already touch Effect.
3. **MUST** drive UI state machines with `Match.value(...).pipe(Match.tag(...), Match.exhaustive)`.
4. **MUST NOT** import `Layer`, `Context`, `Effect.runPromise`, `Effect.runFork`, or `@effect/platform-node` into the client bundle.
5. **MUST** import only `{ Schema, Either, Option, Match, Data, pipe }` from `effect` in client code.
