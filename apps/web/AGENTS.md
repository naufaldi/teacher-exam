@../../AGENTS.md

# @teacher-exam/web — React Frontend

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

## Effect on the Client (Rules)

Inherits the root **Effect-TS Code Style (Mandatory)** rules. Client-specific additions:

1. **MUST** use `Schema.decodeUnknownEither` to validate every API response before consuming it.
2. **MUST** model client-side success/failure with `Either` and absent values with `Option`. **MUST NOT** use `null`/`undefined` sentinels in new code paths that already touch Effect.
3. **MUST** drive UI state machines with `Match.value(...).pipe(Match.tag(...), Match.exhaustive)`.
4. **MUST NOT** import `Layer`, `Context`, `Effect.runPromise`, `Effect.runFork`, or `@effect/platform-node` into the client bundle.
5. **MUST** import only `{ Schema, Either, Option, Match, Data, pipe }` from `effect` in client code.
