# Code Review — Monetization v1 (slot G)

> **Reviewer branch:** `review-eval-model-g`
> **Under review:** monetize implementation on this branch (Model E baseline `f57b11b`) **plus the uncommitted working-tree changes present on the branch**.
> **Baselines:** PRD A (`baselines/prd-a.md`), RFC C (`baselines/rfc-c.md`), Code E notes (`baselines/code-e-notes.md`).

---

## 1. Summary

**Verdict: BLOCKED — fix-first.**

The committed Code E slice (`f57b11b`) is an honest, well-scoped **M1 slice**: shared `billing` schemas, `subscriptions` table + migration, a read-only `EntitlementService`, `GET /api/me/entitlement`, a `totalSoal` cap gate on generate, and generate/dashboard UI copy. That code is clean, type-checks, and its API tests pass. As an M1 (entitlement read model) deliverable it is solid.

However, two things block shipping:

1. **P0 regression (working tree):** three core routes — `_auth.dashboard.tsx`, `_auth.bank-soal.tsx`, `_auth.preview.tsx` — are currently gutted to empty TanStack scaffold stubs (`<div>Hello "/_auth/dashboard"!</div>`). The dashboard test suite fails (12+ tests), and the dashboard plan badge/quota that US-MON-1 requires is gone. This is the same "accidental wipe" class of mistake the Code E notes flagged for `bank-soal-publik.tsx` — it happened again and was **not** reverted.
2. **Spec scope:** the branch delivers roughly **M1 + a partial slice of M2/M3** but is described as an "entitlement MVP". Per RFC §7 the MVP is **M1–M3**. The two load-bearing correctness mechanisms of PRD G4 / RFC RG2 — the `usage_ledger` and reserve→commit→release quota accounting — are **entirely absent**. Quota is displayed but never decremented, and `PLAN_LIMIT_EXCEEDED` (US-MON-3) is never emitted.

If the working-tree wipe is reverted and the slice is re-scoped honestly as "M1 + question-cap gate", it is a shippable **observe-only** increment (which RFC §7 explicitly endorses shipping before enforcement). It is **not** a monetization MVP.

---

## 2. Findings

| id | severity | location | issue | suggested fix |
|----|----------|----------|-------|---------------|
| G-1 | **P0** | `apps/web/src/routes/_auth.dashboard.tsx` (working tree) | Entire dashboard replaced with a scaffold stub rendering `Hello "/_auth/dashboard"!`. Plan badge + quota display (US-MON-1, DoD §6.3) destroyed; loader that fetched `api.me.entitlement()` removed. | Revert the working-tree changes to these routes: `git checkout HEAD -- apps/web/src/routes/_auth.dashboard.tsx apps/web/src/routes/_auth.bank-soal.tsx apps/web/src/routes/_auth.preview.tsx`. Then re-run `pnpm test`. |
| G-2 | **P0** | `apps/web/src/routes/_auth.bank-soal.tsx`, `_auth.preview.tsx` (working tree) | Same wipe: Bank Soal (325→9 lines) and Preview (207→9 lines) reduced to stubs. Breaks Bank Soal reuse (US-MON-... §3.1) and the Free "review → preview → browser print" loop (US-MON-2, US-MON-6). | Same revert as G-1. Add a pre-commit guard / lint check that fails when a route file shrinks below a threshold, or run the route-test suite in CI. |
| G-3 | **P0** | `apps/web/src/routes/__test__/_auth.dashboard.test.tsx` | Dashboard test suite fails (`Unable to find element … Hello "/_auth/dashboard"!`). `pnpm test` is red on this branch → violates DoD §6.5 "`pnpm test` must pass before shipping". | Fix follows automatically from G-1 revert; confirm green. |
| G-4 | **P1** | *absent* — RFC §3.1 `usage_ledger`, §4.1 `UsageService` | No usage ledger table, no `UsageService`, no reserve/commit/release. Generate never decrements `sheet_generate`; `remaining` is a static constant (`3` Free / `100` Pro) forever. PRD G4 and RFC RG2 (the "backbone of quota correctness") are unimplemented. | If branch is scoped as M1-only, document that explicitly and mark quota display as observe-only. Otherwise implement `usage_ledger` + `UsageService` per RFC §3.1/§4.3 before claiming MVP. |
| G-5 | **P1** | `apps/api/src/api/handlers/ai.ts:26-40` | Free-quota exhaustion is never enforced. Handler checks `maxQuestionsPerSheet` but never calls `checkQuota(sheet_generate)`; a Free user can generate unlimited sheets. US-MON-3 / EC-A1 unmet; `ApiPlanLimitExceeded` (402, `PLAN_LIMIT_EXCEEDED`) is never defined nor thrown. | Add `ApiPlanLimitExceeded` to `errors/http.ts`, add `checkQuota`+`reserve` before `generateExam`, and `commit`/`release` on outcome (RFC §4.3). |
| G-6 | **P1** | `apps/api/src/api/services/entitlement-service.ts:75` | `grace` status is mis-handled. `effectivePlan` treats a Pro row in `grace` as Pro (good, EC-C1), but there is **no** lazy grace→past_due computation (`now > paidThrough + 3d`) that RFC §4.9 / EC-C2 requires. A row stuck in `grace` grants Pro forever regardless of `paidThrough`. | Compute effective status from `paidThrough + 3 days` vs `now` before deciding plan; fall back to Free once grace elapses. Add a test around the 3-day boundary. |
| G-7 | **P1** | `apps/api/src/api/services/entitlement-service.ts:61-70,92` | `usage.used` is hard-coded to `0` and `remaining === limit` always. Even ignoring the ledger, the UI copy `Sisa 3 dari 3 lembar bulan ini` is permanently wrong after the first generate. Misleads the teacher (contradicts US-MON-1 intent). | Derive `used`/`remaining` from the ledger once G-4 lands; until then, avoid presenting a precise "Sisa N" count that is known to be stale. |
| G-8 | **P2** | `apps/api/src/api/handlers/ai.ts:32` | `pdf_guru` / `combine` source-mode gate (RFC §4.3, US-MON-5) is missing. Handler only caps question count; a Free user hitting the API with `sourceMode=pdf_guru` is not rejected with `FEATURE_GATED`. | Add the `sourceMode ∈ {pdf_guru, combine} && !features.pdfSourceModes → ApiFeatureGated` branch shown in RFC §4.3. |
| G-9 | **P2** | `apps/web/src/routes/_auth.generate.tsx:246-270` | Two chained `useEffect`s fetch entitlement then clamp `totalSoal`, using an `entitlementLimitApplied` flag to run-once. This is a state-sync-via-effect anti-pattern (see `writing-react-effects`); a Free user who typed 50 before entitlement resolves sees a flash of an invalid value. Also the fetch drops the `Left`/error case silently. | Derive the clamp during render from `maxQuestionsPerSheet`, or gate the form on entitlement load. Surface the `Either.isLeft` branch (toast / retry) instead of ignoring it. |
| G-10 | **P2** | `apps/api/src/api/services/entitlement-service.ts:101-111` | `.pipe(Effect.provideService(DbClient, db))` re-provides `DbClient` inside `get`, but `db` is already yielded from the `DbClient` tag in the enclosing scope — redundant and slightly confusing. | Drop the `provideService`; `runDb(...)` already runs in a context that has `DbClient`. |
| G-11 | **P2** | `packages/db/src/schema/subscriptions.ts` | No index on `status` (RFC §3.1 asks for one for grace-sweep jobs). Harmless at MVP scale but diverges from the spec and will matter when a sweep job lands (RFC §4.9 / Q10). | Add `index("subscriptions_status_idx").on(table.status)` in a follow-up migration. |
| G-12 | **P2** | `apps/api/src/api/handlers/ai.ts:19` + `apps/web/src/lib/billing-copy.ts:3` | `FREE_QUESTION_LIMIT_COPY` is duplicated verbatim in API and web. RFC §5 wants copy sourced from a **shared** constants module; two copies drift. | Move the string to `packages/shared` (or a shared copy module) and import in both. |

---

## 3. Spec gaps (PRD / RFC vs code)

Scope delivered vs RFC §7 phasing:

| Phase | RFC scope | Delivered? |
|-------|-----------|------------|
| **M1** — Entitlement read model | `subscriptions` + enums, `PlanPolicy`, `EntitlementService`, `GET /api/me/entitlement`, dashboard/generate badge+quota | **Mostly.** Service + endpoint + schemas + migration present. `PlanPolicy` is inlined as `FREE_FEATURES`/`PRO_FEATURES` constants rather than a named versioned table (acceptable). Dashboard badge is **destroyed by G-1**. |
| **M2** — Quota enforcement | `usage_ledger`, `UsageService` reserve/commit/release, generate gate + async commit, `ApiPlanLimitExceeded` | **No.** Only the `totalSoal` cap exists (which is really an M3 feature). No ledger, no reservation, no 402. |
| **M3** — Feature gates | PDF upload/source-mode gate, export gate (+ public owner check), `totalSoal` cap, ai-assist gate, templates/analytics gates | **Partial.** Only `totalSoal` cap. No export gate (`export.ts` untouched), no PDF-upload gate (`pdf-uploads.ts` untouched), no source-mode gate, no ai-assist gate. |
| **M4/M5** — Billing | out of MVP | Correctly absent. |

Specific unmet acceptance criteria:

- **US-MON-1** — dashboard plan badge: broken by G-1. Generate badge/quota copy exists (good) but shows stale counts (G-7).
- **US-MON-3 / EC-A1** — "reject before AiClient with `PLAN_LIMIT_EXCEEDED`": **not implemented** (G-5). No 402 error type exists.
- **US-MON-5 / EC-A2 partial** — question cap enforced (good, tested); PDF source-mode gate missing (G-8).
- **US-MON-6** — export download gate: **not implemented**; `export.ts` has no entitlement check, so Free download is not blocked and the public-link owner-entitlement hole (EC-B6) remains open.
- **DoD §6.1** — `usage_ledger` reserve/commit/release: **absent** (G-4). Shared schemas for `PlanCode`/`SubscriptionStatus`/`EntitlementSummary`/`UsageBucket`: **present and correct**. `SubscriptionId` branded id: **present** (`entities.ts:33`). Typed gate errors: only `ApiFeatureGated`; `ApiPlanLimitExceeded` missing.
- **DoD §6.5** — "`pnpm test` passes before shipping": **fails** (G-3).
- **RFC §3.1** — `usage_ledger`, `billing_events` tables: absent (expected for M1; blocks MVP claim).
- **RFC RG1/RG2** — server-authoritative *quota* enforcement: entitlement is server-authoritative (good), but quota is never enforced (G-5) and never accounted (G-4).

Positive spec adherence: schemas match RFC §3.3 field-for-field (including the `limit: -1` fair-use sentinel, handled by `sheetQuotaCopy`); enums are fresh `CREATE TYPE` (no `ADD VALUE` hazard, RFC §3.2); `subscriptions.userId` is `unique` + cascade as specified; absence-of-row ⇒ Free is honored (`summaryFor(null)`).

---

## 4. Test gaps

What exists and is good:
- `entitlement.test.ts` — Free default (no row) and active-Pro row, both schema-decoded. Solid.
- `ai.generate.test.ts` — question-cap gate (explicit `totalSoal:25` and omitted-`totalSoal`-resolving-to-25) both assert `403 FEATURE_GATED` **and** `generateRaw` not called. Good "before AiClient" discipline.
- `billing.test.ts` (shared), `subscriptions.test.ts` (db), `api.test.ts` (web) present.

Missing coverage (tie to RFC §8):
- **No `UsageService` tests** — because the service does not exist (G-4). RFC §8 wants reserve→commit decrements once, reserve→release restores, period_key stable across month boundary, duplicate `source_ref` blocked. All absent.
- **No `PLAN_LIMIT_EXCEEDED` test** — RFC §8 "Free exhausted → 402 and AiClient never invoked". Cannot exist until G-5.
- **No async-job single-commit test** (EC-A4) — the async 202 path (`ai-generate.ts` / `completeGenerationJob`) has no quota commit and no test that polling doesn't double-count.
- **No `EntitlementService` grace / past_due / boundary tests** — G-6 (3-day grace math) is untested; only `active` Pro is covered.
- **No export/pdf-upload gate tests** — features not implemented.
- **Dashboard tests are currently failing** (G-3), not merely missing.
- **Web: no entitlement-refetch-on-402/403 test** (RFC §5, EC-B3) — client never handles those codes.

---

## 5. What looks solid

- **Shared schemas** (`billing.ts`) — a faithful, clean transcription of RFC §3.3; both Schema and `Type` exported per the shared-package rule; `limit: -1` sentinel plumbed through UI copy.
- **`EntitlementService` shape** — correct `Context.Tag` + `Layer.effect`, composed in `AppLayer.ts` with DB provided via `getSharedDatabaseLayer()`; read-model design matches RFC §4.1. Absence-of-row ⇒ Free is the right default.
- **Generate question-cap gate** — the one gate that landed is done right: server-side, before `AiClient`, typed `ApiFeatureGated` (403, `FEATURE_GATED`), Indonesian copy, and covered by two focused tests including the omitted-`totalSoal` edge (a genuinely easy case to miss).
- **Migration** — additive `CREATE TYPE` + `subscriptions` table only; better-auth tables untouched; unique `user_id` + cascade FK exactly per RFC §3.1.
- **Test harness ergonomics** — `useLiveEntitlement` vs injected `entitlement` (with `Layer.succeed(EntitlementService, …)`) is a clean seam that follows the project's "real Layer composition, mock at boundaries" rule and will make future quota tests straightforward.
- **`period_key` / `nextJakartaMonthStartIso`** — `Asia/Jakarta` month math via `Intl.DateTimeFormat("en-CA")` is correct and matches PRD §3.2 (`Reset: 1 Agustus 2026`).
- **Type-check is green** (`pnpm type-check` clean) and API monetize tests pass (15).

---

### Recommended path to unblock

1. Revert the working-tree wipe of the three routes (G-1/G-2/G-3) — this is the only true blocker for the code that was actually intended to ship.
2. Re-label the deliverable as **M1 + question-cap gate (observe-only quota)**, or land M2's `usage_ledger` + `UsageService` + `ApiPlanLimitExceeded` (G-4/G-5) to make the "MVP" claim honest.
3. Fix grace math (G-6) before any billing phase relies on it.
