# RFC: Free / Pro Monetization (Model D — Capability Matrix + Policy Middleware)

> **Status:** Draft | **Date:** 2026-07-10 | **PRD:** [PRD A — Monetization v1](../baselines/prd-a.md)
> **Branch:** `rfc-eval-model-d` | **Artifact:** `docs/evals/monetize-2026/artifacts/rfc-d.md`

---

## 1. Overview + relationship to PRD A

This RFC maps PRD A onto a **capability-matrix** architecture: every plan is a row of allowed features and numeric limits, and every gated endpoint is wrapped by a single `EntitlementPolicy` middleware. The goal is to minimize handler-level gate logic and to make new price tiers (e.g., a future school-year plan) a data change rather than a code change.

Like PRD A, this is an additive layer. The existing better-auth session, `CurrentUser`, `AiClient`, `ExportService`, and Drizzle tables remain unchanged. The only new principle here is **centralized policy enforcement**: the entitlement check happens once at the HTTP boundary, and handlers consume the resulting `GateContext` for fine-grained UX decisions.

---

## 2. Goals / non-goals

### Goals

| ID | Goal |
| -- | ---- |
| G1 | Express Free and Pro limits as a typed capability matrix so limits and feature flags live in one place. |
| G2 | Enforce gates through a reusable middleware wrapper, not repeated per-handler checks. |
| G3 | Track usage with an immutable event journal; release events undo their original usage event. |
| G4 | Keep Free users productive (Buku Siswa generate, review, browser print) while clearly blocking Pro actions. |
| G5 | Preserve access to historical exams, public links, and PDF metadata after downgrade or payment failure. |
| G6 | Allow a stub billing gateway in Code MVP and a live provider adapter later. |

### Non-goals

| Item | Why it is out of scope for this architecture |
| ---- | -------------------------------------------- |
| School / district multi-seat billing | PRD A defers this. |
| Replacing better-auth or Google OAuth | `user.id` is the identity anchor. |
| Rewriting generate/review/export | Policy wraps existing handlers. |
| Production payment hardening | Billing gateway is stub-compatible in Code MVP. |
| Corpus licensing changes | Not a paywall in PRD A. |

---

## 3. Data model / schema changes

### 3.1 New Drizzle tables

All tables are additive; no existing table is altered.

| Table | Purpose | Key columns |
| ----- | ------- | ----------- |
| **`plan_definitions`** | Immutable plan capability matrix. | `code` (PK: `free`, `pro_monthly`, `pro_yearly`), `displayName`, `period`, `capabilities` JSONB, `createdAt`. |
| **`user_plans`** | The current subscription-like record for a user. | `userId` (PK / unique FK → `user.id`), `planCode` FK → `plan_definitions.code`, `status` (`free`, `active`, `grace`, `past_due`, `canceled`), `periodStart`, `periodEnd`, `paidThrough`, `providerCustomerId`, `providerSubscriptionId`, `updatedAt`. |
| **`usage_events`** | Immutable journal of quota consumption and release. | `id`, `userId`, `planCode`, `actionType` (`sheet_generate`, `ai_assist`), `actionId` (UUID, unique per logical action), `delta` (`+1` for use, `-1` for release), `periodKey`, `examId` / `questionId` JSONB context, `createdAt`. |
| **`subscription_events`** | Idempotent provider/admin log. | `id`, `providerEventId` unique, `userId`, `eventType`, `payload` JSONB, `processedAt`. |

Indexes:

- `usage_events_user_period_action` on `(userId, planCode, periodKey, actionType)` for quota aggregation.
- `usage_events_action_id` unique on `actionId` (prevents duplicate usage from retries).
- `user_plans_user_id` unique on `userId`.

### 3.2 Shared Effect Schema additions (`packages/shared`)

| Schema | Location | Notes |
| ------ | -------- | ----- |
| `PlanCodeSchema` | `primitives.ts` | `Literal("free", "pro_monthly", "pro_yearly")`. |
| `SubscriptionStatusSchema` | `primitives.ts` | `Literal("free", "active", "grace", "past_due", "canceled")`. |
| `UsageActionSchema` | `primitives.ts` | `Literal("sheet_generate", "ai_assist")`. |
| `CapabilityMatrixSchema` | new `billing.ts` | `Struct` with `sheetsPerMonth`, `aiAssistsPerMonth`, `maxQuestions`, `sourceModes`, `pdfUpload`, `export`, `customTemplates`, `analytics`, `bankSoalUnlimited`. |
| `EntitlementSummarySchema` | new `billing.ts` | `planCode`, `status`, `isPro`, `periodEnd`, `resetDate`, `capabilities`, `remaining` (sheets, aiAssists), `features`. |
| `GateErrorCodeSchema` | new `billing.ts` | `Literal("PLAN_LIMIT_EXCEEDED", "FEATURE_GATED")`. |

HTTP errors are added in `apps/api/src/api/errors/http.ts`:

- `ApiPlanLimitExceeded` (status 402) with `code: "PLAN_LIMIT_EXCEEDED"`, `resource`, `resetDate`.
- `ApiFeatureGated` (status 403) with `code: "FEATURE_GATED"`, `feature`.

### 3.3 Capability matrix (Code MVP seed)

Seeded via `packages/db/src/seed/plan-definitions.ts`:

```json
{
  "code": "free",
  "displayName": "Free",
  "period": "monthly",
  "capabilities": {
    "sheetsPerMonth": 3,
    "aiAssistsPerMonth": 10,
    "maxQuestions": 20,
    "sourceModes": ["default"],
    "pdfUpload": false,
    "export": false,
    "customTemplates": false,
    "analytics": false,
    "bankSoalUnlimited": false
  }
}
```

```json
{
  "code": "pro_monthly",
  "displayName": "Pro Guru",
  "period": "monthly",
  "capabilities": {
    "sheetsPerMonth": 100,
    "aiAssistsPerMonth": 300,
    "maxQuestions": 50,
    "sourceModes": ["default", "pdf_guru", "combine"],
    "pdfUpload": true,
    "export": true,
    "customTemplates": true,
    "analytics": true,
    "bankSoalUnlimited": true
  }
}
```

A `pro_yearly` row is identical to `pro_monthly` except `period: "yearly"` and the appropriate `displayName`.

### 3.4 Migration notes

- Single migration creates `plan_definitions`, `user_plans`, `usage_events`, and `subscription_events`.
- Seed `plan_definitions` with the two rows above.
- Existing users have no `user_plans` row → entitlement policy defaults to `free`.
- Existing `exams`, `pdf_uploads`, `generation_jobs`, and templates are untouched.

---

## 4. API / service boundaries

### 4.1 New Effect service tags (`apps/api/src/api/services/`)

| Service | Responsibility | File |
| ------- | -------------- | ---- |
| **`PlanCapabilityService`** | Load `plan_definitions` by code. | `plan-capability-service.ts` |
| **`EntitlementPolicyService`** | Pure function: given a plan, status, and aggregated usage, produce an `EntitlementSummary` and resolve gate checks. | `entitlement-policy-service.ts` |
| **`UsageJournalService`** | Append `+1` usage events and `-1` release events keyed by `actionId`. | `usage-journal-service.ts` |
| **`BillingGatewayService`** | Stub or live checkout creation and webhook processing. | `billing-gateway-service.ts` + `billing-gateway-adapters/` |

All services are wired in `AppLayer.ts` with `Layer.provide(getSharedDatabaseLayer())`.

### 4.2 Centralized gate middleware

A new `Entitlement` middleware (`apps/api/src/api/middleware/entitlement.ts`) attaches `GateContext` to the request after checking `CurrentUser` and the target capability:

```ts
withCapability('sheet_generate')   // checks remaining quota
withCapability('pdf_upload')       // checks feature flag
withCapability('export')           // checks feature flag
withCapability('analytics')        // checks feature flag
withCapability('custom_templates') // checks feature flag
```

If a handler needs both a quota check and a feature check, it composes two middlewares. The middleware returns:

- `ApiPlanLimitExceeded` when the quota is exhausted.
- `ApiFeatureGated` when the feature flag is false for the user's plan.
- The `GateContext` is also available to handlers so the UI can read `maxQuestions`, `sourceModes`, etc.

### 4.3 New HTTP endpoints

| Endpoint | Group | Purpose |
| -------- | ----- | ------- |
| `GET /api/me/entitlement` | `MeGroup` | Returns `EntitlementSummary` used by dashboard and `/generate`. |
| `POST /api/billing/checkout` | new `BillingGroup` | Returns provider checkout URL or stub success. |
| `POST /api/billing/webhook` | `BillingGroup` | Public provider webhook; writes `subscription_events` and updates `user_plans`. |
| `POST /api/admin/dev/set-plan` | `DevAuthGroup` | Dev/test override of plan/status. |

### 4.4 Gated endpoints (middleware composition)

| Handler | Middleware | Handler-side gate context |
| ------- | ---------- | --------------------------- |
| `POST /api/ai/generate` | `withCapability('sheet_generate')` | Validates `sourceMode` in `GateContext.sourceModes` and `totalSoal <= GateContext.maxQuestions`. |
| `POST /api/questions/:id/regenerate` | `withCapability('ai_assist')` | — |
| `POST /api/exams/:id/validate-curriculum` | `withCapability('ai_assist')` | — |
| `POST /api/exams/:id/discussion` | `withCapability('ai_assist')` | — |
| `POST /api/pdf-uploads` | `withCapability('pdf_upload')` | — |
| `GET /api/exams/:id/export` | `withCapability('export')` | — |
| `POST /api/templates` | `withCapability('custom_templates')` | — |
| `GET /api/analytics/...` | `withCapability('analytics')` | For Free users, return a locked-state summary instead of full analytics. |
| `GET /api/public/exams/:slug/export` | No middleware; handler resolves owner and checks `EntitlementPolicyService` directly. | Avoid leaking existence of the exam if export is unavailable. |

### 4.5 Usage journal flow

1. Middleware `withCapability('sheet_generate')` pre-computes remaining quota from `usage_events` and rejects if exhausted.
2. On entering the handler, the handler asks `UsageJournalService` to append a usage event with a fresh `actionId`.
3. The handler runs the expensive work (AI generate, export, etc.).
4. If the work succeeds, the event stays committed.
5. If the work fails, the handler appends a matching release event with the same `actionId` (`delta = -1`), making the net effect zero.
6. For async jobs, the `actionId` is stored on the `generation_jobs` row; the worker appends the final usage or release event once.

This journal model naturally supports idempotency (EC-A5) and auditability (EC-D5).

### 4.6 Subscription status state machine

```textnfree -> active          (checkout confirmed / admin override)
active -> grace           (renewal fails, now > paidThrough, <= paidThrough + 3 days)
active -> canceled        (explicit cancellation at period end)
grace  -> active          (payment succeeds)
grace  -> past_due        (3 days pass without payment)
past_due -> active        (payment recovers)
past_due -> free          (after a configurable finalization window, or admin cancellation)
```

`EntitlementPolicyService` treats `active` and `grace` as Pro; `past_due` and `canceled` are evaluated against the `free` plan for new actions. Historical reads are never gated by status.

---

## 5. Web UX touchpoints

### 5.1 New API client module

`apps/web/src/lib/api/billing.ts` adds:

- `api.me.entitlement()`
- `api.billing.checkout()`

### 5.2 UI surfaces

| Page | Behavior |
| ---- | -------- |
| **Dashboard** | Plan badge (`Free` / `Pro Guru`), remaining quota, reset date (`Reset: 1 Agustus 2026`). |
| **`/_auth/generate`** | Quota bar (`Sisa 2 dari 3 lembar bulan ini`); source modes outside `entitlement.capabilities.sourceModes` are shown locked with upgrade CTA; `totalSoal` capped to `maxQuestions`; generate button disabled when `remainingSheets === 0`. |
| **Review / exam detail** | Regenerate, pembahasan, and curriculum-validation actions are disabled when `remainingAiAssists === 0`. Export buttons disabled for Free; browser-print always active. |
| **PDF library** | Free users can list/delete their own uploads but cannot select them for generate. |
| **Templates** | Creating a custom template is disabled for Free; applying existing templates stays available. |
| **Analytics** | Free users see a locked-state card with Pro CTA; CSV export is not offered. |
| **Public share page** | Browser print always available. Download button is only rendered if the owner's current entitlement has `export: true`. |

### 5.3 User-facing copy

Indonesian copy mirrors PRD A §3.3:

- `Kuota gratis bulan ini habis. Upgrade ke Pro untuk membuat lebih banyak lembar.`
- `PDF saya tersedia di Pro: upload LKPD/modul sendiri dan pakai ulang dari perpustakaan.`
- `Export PDF/DOCX tersedia di Pro. Anda tetap bisa cetak dari browser.`
- `Free mendukung sampai 20 soal. Pro mendukung sampai 50 soal per lembar.`

---

## 6. Edge cases + failure modes

| ID | Condition | Handling |
| -- | ----------- | -------- |
| EC-A1 | Free user exhausted | Middleware computes `remainingSheets = 0` and returns `PLAN_LIMIT_EXCEEDED` before the handler. |
| EC-A2 | Free user submits `totalSoal > 20` | Handler reads `GateContext.maxQuestions` (20 for Free) and returns `FEATURE_GATED`. |
| EC-A3 | AI provider fails after usage event | Handler appends a release event with the same `actionId`; net quota unchanged. |
| EC-A4 | Async job completes/fails | Worker appends exactly one usage or release event per `actionId`; polling is read-only. |
| EC-A5 | Double-click / retry | `actionId` uniqueness prevents duplicate usage events; retries return the same outcome or are rejected cleanly. |
| EC-A6 | Month changes during request | `periodKey` is fixed at the time of the usage event; the entitlement check uses the current period key. |
| EC-B1 | Free → Pro upgrade | `EntitlementPolicyService` reads the new `user_plans` row; no logout. |
| EC-B3 | Pro expires while on `/generate` | Next action hits the server; client refreshes entitlement on `402`/`403`. |
| EC-B5 | Downgraded user duplicates old Pro exam | Duplicate handler checks `GateContext.maxQuestions` and `sourceModes`; either create a Free-compatible copy or block with clear reason. |
| EC-C1 | Renewal fails | Status becomes `grace`; Pro capabilities remain active for 3 days; UI warning. |
| EC-C2 | Grace ends unpaid | Status becomes `past_due`; new Pro actions blocked; historical access preserved. |
| EC-C4 | Duplicate webhook | `subscription_events.providerEventId` unique constraint prevents double updates. |
| EC-D1 | Client plan JSON tampered | `EntitlementPolicyService` is server-side; client values are ignored for authorization. |
| EC-D3 | Pro exceeds rate limit | `AiGenerateRateLimitLive` returns `RATE_LIMITED`, separate from billing errors. |
| EC-E1 | `DEV_AUTH_ENABLED` | Dev endpoint can mutate `user_plans`; no live provider needed. |

---

## 7. Phasing / migration

| Phase | Deliverable | What changes |
| ----- | ----------- | ------------ |
| **P1** | Capability matrix + entitlement endpoint | Add `plan_definitions`, `user_plans`, shared schemas; seed plan rows; `GET /me/entitlement`. |
| **P2** | Gate middleware + sheet quota | Add `Entitlement` middleware; `withCapability('sheet_generate')` on `POST /api/ai/generate`; enforce `maxQuestions` and `sourceModes`. |
| **P3** | Feature gates | `pdf_upload`, `export`, `custom_templates`, `analytics` gates; public export checks owner entitlement. |
| **P4** | AI-assist journal | `UsageJournalService` and `ai_assist` capability on regenerate, pembahasan, curriculum validation. |
| **P5** | Billing gateway + status machine | Stub checkout/webhook; `active` → `grace` → `past_due` transitions; dev override. |
| **P6** | Production provider adapter | Live provider behind `BillingGatewayService`; secrets only in env. |

### Migration

- Existing users without a `user_plans` row default to `free`.
- Existing `exams` and `pdf_uploads` remain fully accessible.
- Existing public share links keep working; their export availability follows the owner's current entitlement.

---

## 8. Test plan sketch

### API / service tests

| Test | Where |
| ---- | ----- |
| `PlanCapabilityService` returns the correct matrix for Free and Pro. | `apps/api/src/api/services/__test__/plan-capability-service.test.ts` |
| `EntitlementPolicyService` computes remaining quota and feature flags correctly for all statuses. | `apps/api/src/api/services/__test__/entitlement-policy-service.test.ts` |
| `UsageJournalService` net usage is correct after usage + release events. | `apps/api/src/api/services/__test__/usage-journal-service.test.ts` |
| `Entitlement` middleware rejects exhausted Free users before the handler runs. | `apps/api/src/api/middleware/__test__/entitlement.test.ts` |
| `POST /api/ai/generate` does not invoke `AiClient` when quota is exhausted. | `apps/api/src/api/handlers/__test__/ai.test.ts` |
| Async generation worker appends exactly one usage event and none on repeated polls. | `apps/api/src/jobs/__test__/generation-worker.test.ts` |
| Public export checks the **owner's** entitlement, not the viewer. | `apps/api/src/api/handlers/__test__/export.test.ts` |

### Web tests

| Test | Where |
| ---- | ------ |
| `/generate` disables locked source modes and exhausted generate button. | `apps/web/src/routes/__test__/_auth.generate.test.tsx` |
| `/generate` caps `totalSoal` to `maxQuestions` for Free. | same |
| Export buttons show Pro-locked copy for Free. | review route tests |

### Browser verification (per AGENTS.md)

- Free user: Buku Siswa generate → review → browser print → exhaust quota → upgrade CTA.
- Pro user: PDF upload → combine generate → finalize → export PDF/DOCX.
- Downgraded user: open historical exam → browser print works; new export is blocked.
- No console errors or warnings.

---

## 9. Open questions

| Question | Why it matters |
| -------- | -------------- |
| Should `plan_definitions` be code constants or database rows in the Code MVP? | Rows make future price tiers easier; constants are fewer migrations. |
| Should the usage journal be aggregated on every request, or should we maintain a `usage_counters` materialized row? | Counters improve performance but add complexity; aggregation is fine at MVP scale. |
| Should the billing gateway run in the same process or as a separate worker? | A separate worker isolates webhook retries but adds deployment complexity. |
| Which production payment provider should the adapter target? | Webhook and checkout payload shapes differ. |
| Should Free users get a one-time `pdf_guru` trial? | Conversion benefit vs. cost and abuse risk. |
| Should public Bank Soal reuse count against the `sheetsPerMonth` quota? | PRD A currently leaves it free; changing it affects acquisition. |
| Should `ai_assist` include the initial sheet generate? | PRD A treats them as separate buckets, but this should be explicit. |

---

## 10. Conflict notes against PRD A

No conflicts. This model satisfies every PRD A user story and edge case. One architectural choice that differs from a literal reading of PRD A §6.1: PRD A says "usage ledger supports reservation/commit/release" — this RFC uses an **immutable event journal with release events** rather than status transitions on a ledger row. The observable behavior is identical (reserve before work, commit on success, release on failure), and the journal model is better suited to the capability-matrix policy.
