# Generate salvage — browser E2E

Date: 2026-05-19  
Tool: `agent-browser`  
Web: `http://localhost:5173`  
API: `http://localhost:3000`

**Verified 2026-05-19** with `DEV_SIMULATE_SALVAGE=1`: `201` incomplete (19 valid + 1 placeholder), fast review banner, Regenerate on soal 20, preview blocked then allowed after `POST /questions/:id/regenerate`. Screenshots in `.agent-browser/generate-salvage-*.png`.

## Preconditions

```bash
# .env
DEV_AUTH_ENABLED=true
VITE_DEV_AUTH=true
DEV_SIMULATE_SALVAGE=1   # API only — returns 24 valid + 1 invalid without calling MiniMax
```

```bash
pnpm dev
pnpm db:seed:dev   # if needed
```

Restart `pnpm dev` after changing env.

## Flow

1. Login via **Masuk Guru Dev** on `/`
2. `/generate` — fill form (Kelas 5, Matematika, 25 soal, Mode Cepat) → **Generate**
3. Land on `/review?mode=fast&from=generate` with warning toast (not error dialog)
4. Banner: “1 soal gagal dibuat otomatis”
5. Row 25: **Regenerate** visible
6. Click **Regenerate** on soal 25 (uses real `POST /questions/:id/regenerate`)
7. After fix, **Preview Lembar** enabled

## Screenshots (`.agent-browser/`)

| File | Step |
|------|------|
| `generate-salvage-01-login.png` | Dashboard or `/generate` |
| `generate-salvage-02-generating.png` | Progress modal (optional) |
| `generate-salvage-03-review-banner.png` | Review + banner |
| `generate-salvage-04-failed-row-regenerate.png` | Failed row + Regenerate |
| `generate-salvage-05-after-regen.png` | After single regen |
| `generate-salvage-06-preview-blocked.png` | Preview disabled before regen |
| `generate-salvage-07-preview-allowed.png` | Preview after all gaps fixed |

## Console

No `error` / `warn` after the full flow.
