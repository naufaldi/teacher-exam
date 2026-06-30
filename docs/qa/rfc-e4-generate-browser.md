# RFC-E4 Generate form browser verification

Date: 2026-06-30  
Tool: `agent-browser`  
Web: `http://localhost:5173`  
API: `http://localhost:3000`

## Preconditions

- [x] `pnpm dev` — web `:5173`, API `:3000`
- [x] `pnpm db:migrate` applied
- [x] Dev auth: `DEV_AUTH_ENABLED=true`, `VITE_DEV_AUTH=true`, `pnpm db:seed:dev`

## Flow matrix

| ID | Route / action | Status | Console | Screenshot |
|----|----------------|--------|---------|------------|
| G1 | `/generate` Kelas 1 — ready subjects + unavailable labels | Pass (2026-06-30) | Clean | `rfc-e4-generate-k1.png` |
| G2 | `/generate` Kelas 4 — Fase B, IPAS + BI opsional | Pass (2026-06-30) | Clean | `rfc-e4-generate-k4.png` |
| G3 | `/generate` Kelas 6 — subject list with availability | Pass (2026-06-30) | Clean | `rfc-e4-generate-k6.png` |
| G4 | Grade change clears Bab selection | Pass (unit tests) | — | — |

## Headless shortcut

```bash
mkdir -p .agent-browser
agent-browser open http://localhost:5173/ \
  && agent-browser eval "fetch('/api/dev/login',{method:'POST',credentials:'include'}).then(r=>r.status)" \
  && agent-browser open http://localhost:5173/generate \
  && agent-browser wait --load networkidle \
  && agent-browser snapshot -i
```
