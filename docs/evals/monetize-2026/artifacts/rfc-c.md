# RFC: Monetization v1 — Free / Pro Entitlement + Usage Quota Layer

> **Status:** Draft | **Date:** 2026-07-10 | **PRD:** [baselines/prd-a.md](../baselines/prd-a.md)

---

## 1. Overview

This RFC turns **PRD A (Monetization v1)** into an implementable architecture for this monorepo. It adds a two-tier plan model (**Free** / **Pro Guru**) as an **additive entitlement + usage-quota layer** over the existing authenticated guru account (`user.id`). It does **not** replace better-auth, the Effect HttpApi server, the generate/review/export loop, or the Drizzle/Postgres data model.

The design fits four existing seams observed in the codebase:

- **Effect Schema** contracts in `packages/shared/src/schemas/` (single source of truth for API types).
- **Drizzle** tables in `packages/db/src/schema/` (migrations are additive; better-auth `user`/`session`/`account` tables are untouched).
- **Effect service layers** composed in `apps/api/src/layers/AppLayer.ts` (`Context.Tag` + `Layer.effect`).
- **HttpApi handlers + middleware** in `apps/api/src/api/handlers/` and `apps/api/src/api/middleware/` (auth via `CurrentUser`, typed `Schema.TaggedError` HTTP errors).

### 1.1 Relationship to PRD A

| PRD A element | This RFC |
| ------------- | -------- |
| §1.2 two-tier plan on `user.id` | `EntitlementService` resolves plan from a `subscriptions` row keyed by `userId`; defaults to Free when absent. |
| §3 Free vs Pro matrix | Encoded as a server-side `PlanPolicy` table + typed gate checks; UI mirrors, never authoritative (EC-D1). |
| §4 quota reserve/commit/release (G4) | `UsageService` ledger with reservation rows, tied into `POST /api/ai/generate` before `AiClient` and into async `generation_jobs` commit. |
| §5 edge cases | Mapped to typed errors + reservation-period keys in §6. |
| §6 DoD | Data/contract/API/UX/billing/testing tasks mapped to phases in §7. |
| §7 open questions | Carried forward in §9 plus RFC-level implementation questions. |

PRD A is implemented **as written**. Where the PRD leaves a decision open or where it collides with an existing code seam, this RFC records it in **§9 Open questions** rather than silently resolving it.

---

## 2. Goals / Non-goals

### 2.1 Goals

| ID | Goal | PRD trace |
| -- | ---- | --------- |
| RG1 | Server-authoritative entitlement: every Pro-gated action checks plan/quota server-side before expensive work. | G3, US-MON-3, EC-D1 |
| RG2 | Correct usage accounting: reserve → commit → release, single commit per async job, period-keyed counting. | G4, EC-A3–A6 |
| RG3 | Additive schema + tables + layers; zero rewrite of generate/review/export; zero changes to better-auth tables. | G3, non-goals |
| RG4 | Billing modeled as a stubbable Effect service boundary; no live provider secret required for tests. | US-MON-9, §6.4 |
| RG5 | Safe downgrade: historical read/print/share never plan-gated; only *new* Pro actions gate. | G6, US-MON-7, EC-B4 |
| RG6 | Indonesian, point-of-action locked-state copy sourced from shared constants. | G5, §3.3 |

### 2.2 Non-goals

Inherited verbatim from PRD A §2.2: no multi-tenant/district billing, no student-facing payments, no soal marketplace, no better-auth replacement, no generate/review/export rewrite, no curriculum licensing paywall, no full production billing hardening in the Code MVP, no blocking of historical access. This RFC adds one RFC-level non-goal: **no new auth or session system** — plan state is a projection of the existing better-auth session `userId`.

---

## 3. Data model / schema changes

All new tables are additive migrations under `packages/db/src/schema/`. Better-auth tables (`user`, `session`, `account`, `verification` in `users.ts`) are **not modified**. Timestamps use `timestamp({ withTimezone: true })` to match existing convention; period math is `Asia/Jakarta` (PRD §3.2).

### 3.1 New tables

**`subscriptions`** — one row per guru (`packages/db/src/schema/subscriptions.ts`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` PK default random | |
| `user_id` | `text` FK → `user.id` `onDelete cascade`, **unique** | one active plan per guru |
| `plan` | `plan_code` enum | `free` \| `pro` |
| `status` | `subscription_status` enum | `active` \| `grace` \| `past_due` \| `canceled` \| `free` (PRD EC-C, US-MON-8) |
| `current_period_start` | timestamptz | billing/quota window start |
| `current_period_end` | timestamptz | window end |
| `paid_through` | timestamptz nullable | grace math anchor (EC-B2, EC-C1) |
| `provider` | `text` nullable | `stub` \| provider name |
| `provider_customer_id` | `text` nullable | opaque |
| `provider_subscription_id` | `text` nullable | opaque |
| `cancel_at_period_end` | `boolean` default false | scheduled downgrade (EC-B2) |
| `created_at` / `updated_at` | timestamptz | |

Absence of a row ⇒ Free (no backfill migration required). Index on `user_id` (unique already), and on `status` for grace-sweep jobs.

**`usage_ledger`** — reserve/commit/release rows (`usage-ledger.ts`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` PK | |
| `user_id` | `text` FK → `user.id` cascade | |
| `action` | `usage_action` enum | `sheet_generate` \| `ai_assist` |
| `state` | `usage_state` enum | `reserved` \| `committed` \| `released` |
| `period_key` | `text` | `YYYY-MM` in `Asia/Jakarta`, computed at reservation time (EC-A6) |
| `amount` | `integer` default 1 | |
| `source_ref` | `text` nullable | idempotency key: `examId` / `jobId` / `questionId` (EC-A5, US-MON-10) |
| `reserved_at` / `settled_at` | timestamptz | |

**Counting rule:** remaining quota for `(userId, action, periodKey)` = `limit − Σ amount WHERE state IN (reserved, committed)`. Released rows do not count (EC-A3). Unique partial index on `(user_id, action, source_ref)` where `source_ref IS NOT NULL` prevents double reservation on double-submit / two tabs (EC-A5).

**`billing_events`** — provider/manual event log for idempotency (`billing-events.ts`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` PK | |
| `provider_event_id` | `text` **unique** | idempotent by provider event id (EC-C4) |
| `user_id` | `text` nullable | resolved at handling |
| `type` | `text` | `checkout.completed`, `renewal.failed`, `manual.override`, … |
| `payload_json` | `jsonb` | raw event |
| `processed_at` | timestamptz nullable | |

### 3.2 New enums

Added to `packages/db/src/schema/enums.ts`: `plan_code`, `subscription_status`, `usage_action`, `usage_state`. Migration generated via `pnpm db:generate` (note the repo's known `ADD VALUE` enum migration gotcha — new enums are fresh `CREATE TYPE`, not `ADD VALUE`, so no repeat-value hazard).

### 3.3 Shared schemas (Effect Schema)

New file `packages/shared/src/schemas/billing.ts`, re-exported from `src/index.ts`:

```typescript
export const PlanCodeSchema = Schema.Literal("free", "pro")
export type PlanCode = typeof PlanCodeSchema.Type

export const SubscriptionStatusSchema = Schema.Literal(
  "active", "grace", "past_due", "canceled", "free"
)
export type SubscriptionStatus = typeof SubscriptionStatusSchema.Type

export const UsageActionSchema = Schema.Literal("sheet_generate", "ai_assist")
export type UsageAction = typeof UsageActionSchema.Type

export const UsageBucketSchema = Schema.Struct({
  action: UsageActionSchema,
  used: Schema.Int,
  limit: Schema.Int,        // -1 sentinel = fair-use / effectively uncapped for Pro
  remaining: Schema.Int,
  periodKey: Schema.String, // "2026-07"
  resetAt: Schema.String    // ISO; UI renders "Reset: 1 Agustus 2026"
})
export type UsageBucket = typeof UsageBucketSchema.Type

export const EntitlementSummarySchema = Schema.Struct({
  plan: PlanCodeSchema,
  status: SubscriptionStatusSchema,
  paidThrough: Schema.NullOr(Schema.String),
  features: Schema.Struct({
    pdfSourceModes: Schema.Boolean,   // pdf_guru + combine
    pdfUpload: Schema.Boolean,
    pdfImages: Schema.Boolean,
    exportDownload: Schema.Boolean,   // authenticated PDF/DOCX
    customTemplates: Schema.Boolean,
    analyticsDeep: Schema.Boolean,
    publicBankReuse: Schema.Boolean
  }),
  limits: Schema.Struct({
    maxQuestionsPerSheet: Schema.Int  // 20 Free / 50 Pro
  }),
  usage: Schema.Array(UsageBucketSchema)
})
export type EntitlementSummary = typeof EntitlementSummarySchema.Type
```

New branded id in `entities.ts` (per branding rule): `SubscriptionIdSchema = Schema.String.pipe(Schema.brand("SubscriptionId"))` (+ `brandSubscriptionId`). `usage_ledger` / `billing_events` ids stay internal (server-only) unless surfaced across packages.

### 3.4 Untouched ownership

`exams.userId` remains the ownership key; **no migration alters exam ownership** (PRD §6.1). Historical `pdf_uploads` rows stay listable/deletable regardless of plan (US-MON-7).

---

## 4. API / service boundaries

### 4.1 New Effect services (Context.Tag + Layer)

Added under `apps/api/src/api/services/` and composed into `AppLayer.ts`. Each follows the existing `DbClient`/`runDb` + `Data.TaggedError` pattern.

| Service Tag | Responsibility | Depends on |
| ----------- | -------------- | ---------- |
| **`EntitlementService`** | Resolve `EntitlementSummary` for a `userId`; evaluate `canUse(feature)` and `checkQuota(action)`. Applies grace/past_due/suspension logic. Pure read model over `subscriptions` + `usage_ledger` + `PlanPolicy`. | `DbClient`, `BillingService` |
| **`UsageService`** | `reserve(userId, action, sourceRef?) → ReservationId`, `commit(ref)`, `release(ref)`. Enforces idempotency + period key. | `DbClient` |
| **`BillingService`** | Provider boundary: `startCheckout`, `applyEvent(billingEvent)`, `assignPlan` (dev/manual). **Stub** and **live** layer variants. | `DbClient`, `AppConfig` |

`PlanPolicy` is a static, versioned in-code table (not env, not client) encoding PRD §3.1 matrix — the single place limits/features live server-side.

### 4.2 Entitlement read endpoint (US-MON-1, EC-D1)

New group `entitlement` (definition in `api/groups/`, handler `api/handlers/entitlement.ts`), `Authorization` + `GlobalRateLimit` middleware:

```
GET /api/me/entitlement
→ 200 EntitlementSummary   // authoritative; UI never uses client-side constants
```

`GET /api/me` (existing) stays unchanged; the web dashboard fetches entitlement separately so profile caching is untouched.

### 4.3 Gated generate (US-MON-2, US-MON-3, G4, EC-A1/A3/A4/A6)

Gate is inserted in `apps/api/src/api/handlers/ai.ts` **before** `generateExam(...)` invokes `AiClient`, and inside the async job commit path in `lib/ai-generate.ts` (which already returns `{ _tag: "accepted", status: 202, body: { examId, jobId } }` and calls `completeGenerationJob`).

Sequence (`sourceMode=default`, sync path):

```
handler:
  { userId } = CurrentUser
  ent = EntitlementService.get(userId)
  if payload.sourceMode in (pdf_guru, combine) and not ent.features.pdfSourceModes:
      fail ApiFeatureGated                      // FEATURE_GATED (US-MON-5)
  if payload.totalSoal > ent.limits.maxQuestionsPerSheet:
      fail ApiFeatureGated / validation         // EC-A2
  quota = EntitlementService.checkQuota(sheet_generate)
  if quota.remaining <= 0:
      fail ApiPlanLimitExceeded                 // PLAN_LIMIT_EXCEEDED (US-MON-3) — before AiClient
  ref = UsageService.reserve(userId, sheet_generate, sourceRef = idempotencyKey)
  result = generateExam(userId, payload, aiService)   // existing
    on system/AI failure → UsageService.release(ref)   // EC-A3
    on sync success       → UsageService.commit(ref)    // US-MON-2
    on 202 async accepted → leave reserved; job commits once (see §4.4)
```

`idempotencyKey`: derived from an optional `Idempotency-Key` header, else a hash of `(userId, payload)`; maps to `usage_ledger.source_ref` so double-click/two-tab submits collapse to one reservation (EC-A5, US-MON-10).

### 4.4 Async job commit (EC-A4, G4)

The async path already persists `generation_jobs` and calls `completeGenerationJob(jobId, count)`. Commit rule: **`UsageService.commit(ref)` fires exactly once, keyed on `source_ref = jobId`**, when the job transitions `running → completed`. Polling `GET /api/exams/:id/generate-stream` never mutates usage. A failed job (`failed`) triggers `release(ref)`. Stale-job reclaim (existing `reclaimStaleRunningJobs`) releases reservations for jobs it fails.

### 4.5 AI-assist gating (US-MON-1 limits, EC-A7/A8)

`ai_assist` covers question regenerate, pembahasan generation, and curriculum validation (PRD §3.2). Each corresponding handler (`questions.ts` regenerate, exams validate-curriculum / discussion) calls `checkQuota(ai_assist)` → `reserve` → `commit`/`release` with `source_ref` = `questionId`/`examId+action`. Free limit 10/mo, Pro 300/mo fair use.

### 4.6 Gated export (US-MON-6, EC-B6)

`apps/api/src/api/handlers/export.ts`:

- `exportExam` (authenticated): add `EntitlementService.get(userId)`; if `!features.exportDownload` → `ApiFeatureGated`. Browser-print path is a web route (no download endpoint) so it is never gated.
- `exportPublicExam`: resolve the **owner's** entitlement (from the exam's `userId`); if the owner lacks `exportDownload`, the public download is gated too (EC-B6, US-MON-6) — public links stay *viewable/printable* but not downloadable. This closes the "public link bypasses Pro gate" hole.

### 4.7 PDF upload gating (US-MON-5, EC-D2)

`POST /api/pdf-uploads` → `ApiFeatureGated` for Free (`FEATURE_GATED`). `GET`/`DELETE` remain open (list/delete legacy uploads). Existing `userId`-scoped ownership check is unchanged (EC-D2).

### 4.8 Templates & analytics gating

Custom template create/reuse (`templates.ts`) and deep analytics / CSV export (`analytics.ts`) call `EntitlementService` feature checks; default templates + basic correction stay Free (PRD §3.1).

### 4.9 Billing endpoints (US-MON-8, US-MON-9, EC-C)

New group `billing`:

```
POST /api/billing/checkout        → { checkoutUrl } | stub { activated: true }   (Auth)
POST /api/billing/webhook         → 204   (no auth; provider-signed; idempotent by provider_event_id)
POST /api/dev/billing/assign-plan → 204   (DEV_AUTH_ENABLED only; body { plan })
```

`BillingService.applyEvent` is idempotent (unique `provider_event_id`, EC-C4). Renewal-failed → status `grace` with `paid_through`; 3-day grace elapsed → `past_due` (entitlement falls back to Free for *new* actions, EC-C2); recovery → `active` with no data migration (EC-C3, US-MON-8). Grace transitions are computed lazily in `EntitlementService.get` (compare `now` vs `paidThrough + 3d`) and swept by a periodic job — no separate scheduler is required for correctness.

### 4.10 Typed HTTP errors (US-MON-3, US-MON-10)

Added to `apps/api/src/api/errors/http.ts` following the existing `Schema.TaggedError` + `HttpApiSchema.annotations({ status })` pattern:

```typescript
class ApiPlanLimitExceeded extends Schema.TaggedError<…>()(
  "ApiPlanLimitExceeded",
  { error: Schema.String, code: Schema.Literal("PLAN_LIMIT_EXCEEDED"),
    action: UsageActionSchema, resetAt: Schema.String },
  HttpApiSchema.annotations({ status: 402 })   // Payment Required
) {}

class ApiFeatureGated extends Schema.TaggedError<…>()(
  "ApiFeatureGated",
  { error: Schema.String, code: Schema.Literal("FEATURE_GATED"), feature: Schema.String },
  HttpApiSchema.annotations({ status: 403 })
) {}
```

`PLAN_LIMIT_EXCEEDED` (402), `FEATURE_GATED` (403), and existing `RATE_LIMITED` (429) are **distinct codes/copy** (US-MON-10) — rate-limit middleware (`AiGenerateRateLimitLive`, `GlobalRateLimitLive`) is untouched and independent of plan (EC-D3).

### 4.11 Layer composition

`AppLayer.ts`: add `EntitlementServiceLive`, `UsageServiceLive`, `BillingServiceLive` (with DB via `getSharedDatabaseLayer()`) into `CoreLive`; add `EntitlementLive` / `BillingLive` handlers into `HandlersLive`. No change to `MiddlewareLive` (gating is in-handler, not middleware, so it can emit action-specific typed errors and read the request payload).

---

## 5. Web UX touchpoints

Additive to existing routes; all copy Indonesian, sourced from a shared `billing-copy.ts` constants module.

| Surface | Change | PRD trace |
| ------- | ------ | --------- |
| Dashboard | Plan badge (`Free` / `Pro Guru`) from `GET /api/me/entitlement`. | US-MON-1 §6.3 |
| `_auth.generate.tsx` | Show `Sisa 2 dari 3 lembar bulan ini` + reset date; disable generate at 0 remaining; `totalSoal` max clamped to `limits.maxQuestionsPerSheet`. | US-MON-1/2/3, EC-A1/A2 |
| Source-mode selector | `PDF saya saja` / `Buku Siswa + PDF` shown **locked** for Free with copy + upgrade CTA. | US-MON-5 |
| Review / question cards | Regenerate / pembahasan / Periksa kurikulum show locked state when `ai_assist` exhausted. | EC-A7/A8 |
| Export buttons | Download PDF/DOCX gated; browser-print always available; copy `Export PDF/DOCX tersedia di Pro. Cetak dari browser tetap gratis.` | US-MON-6 |
| Analytics | Locked Pro state instead of hiding historical results. | US-MON-7, EC-B... |
| Upgrade CTA | Present at blocked moments only; does not interrupt Free flow before a limit is hit. | §6.3 |
| Payment banner | Grace/past_due warning banner (from `status`); Pro-until-date on scheduled downgrade. | US-MON-8, EC-B2/C1 |

Client refreshes entitlement on any `402`/`403` from a gated endpoint (server is source of truth, EC-B3). Web API client additions live in `apps/web/src/lib/api/` mirroring existing patterns; a `useEntitlement` query caches the summary.

---

## 6. Edge cases + failure modes

| PRD EC | Handling in this RFC |
| ------ | -------------------- |
| EC-A1 | Free 0 quota → generate disabled (UI) + `ApiPlanLimitExceeded` (402) before `AiClient`. |
| EC-A2 | `totalSoal > maxQuestionsPerSheet` → UI clamp + server `ApiFeatureGated`/validation. |
| EC-A3 | AI/system failure after reserve → `UsageService.release(ref)`; remaining restored. |
| EC-A4 | Async job commits once on `completed`, keyed by `jobId`; polling never mutates usage. |
| EC-A5 | `Idempotency-Key`/payload-hash → `source_ref`; unique index blocks double reservation. |
| EC-A6 | `period_key` fixed at reservation time; month rollover mid-job does not shift the counted bucket. |
| EC-A7/A8 | `ai_assist` quota checked per action; exhausted → locked action, existing question unchanged. |
| EC-B1 | Upgrade → `EntitlementService.get` returns `pro` immediately (row status `active`); no logout. |
| EC-B2 | `cancel_at_period_end=true`; Pro kept until `paidThrough`/period end; banner shows date. |
| EC-B3 | Server authoritative; client refetches entitlement on 402/403. |
| EC-B4/B5 | Historical exam read never gated; duplicate of Pro-era exam re-checks gates (PDF source / >20 soal) and blocks with clear reason or produces Free-compatible copy. |
| EC-B6 | Public download resolves **owner** entitlement; view/print stays free. |
| EC-C1 | Renewal fail → `grace`; gates still allow Pro; warning banner. |
| EC-C2 | Grace elapsed (>3d past `paidThrough`) → `past_due`; new Pro actions fall back to Free. |
| EC-C3 | Payment recovers → `active`; no data migration. |
| EC-C4 | `billing_events.provider_event_id` unique → idempotent webhook. |
| EC-C5 | Provider unavailable → no plan change until confirmed event/admin override; friendly retry. |
| EC-D1 | All gates server-side; client JSON tampering yields no unlock. |
| EC-D2 | PDF ownership stays `userId`-scoped; foreign id → not found/forbidden. |
| EC-D3 | Rate-limit copy/codes distinct from billing; Pro still rate-limited. |
| EC-D4 | IP/global heuristics (existing middleware) independent of plan. |
| EC-D5 | Suspension flag overrides subscription entitlement (abuse > paid). |
| EC-E1 | `DEV_AUTH_ENABLED` + `POST /api/dev/billing/assign-plan` switches plan via seed/config. |
| EC-E2 | Missing live billing env → stub only if explicitly configured; production startup fails if live billing required but unconfigured. |
| EC-E3/E4 | Offline before API = no reservation; async job continues server-side, quota commit follows job result. |

**Failure-mode invariant:** a reservation is always terminal — every `reserve` is followed by exactly one `commit` or `release` (sync in-handler; async on job terminal state; stale-job sweep releases orphans). This is the backbone of G4 quota correctness.

---

## 7. Phasing / migration

Additive migrations only; each phase is independently shippable and testable. MVP = M1–M3.

| Phase | Deliverable | Data / API | MVP? |
| ----- | ----------- | ---------- | ---- |
| **M1 — Entitlement read model** | `subscriptions` + enums; `PlanPolicy`; `EntitlementService`; `GET /api/me/entitlement`; dashboard/generate badge + quota display (read-only). | migration, shared `billing.ts`, entitlement group | **MVP** |
| **M2 — Quota enforcement (generate)** | `usage_ledger`; `UsageService` reserve/commit/release; gate `POST /api/ai/generate` (sync + async commit); `ApiPlanLimitExceeded`/`ApiFeatureGated`; generate UI disable + copy. | migration, ai handler, ai-generate job path | **MVP** |
| **M3 — Feature gates** | PDF upload/source-mode gate, export download gate (incl. public owner check), `totalSoal` cap, ai-assist gate (regenerate/pembahasan/validate), templates + analytics gates; full Indonesian locked-state copy. | handlers export/pdf-uploads/questions/exams/templates/analytics | **MVP** |
| **M4 — Billing boundary** | `BillingService` stub + `billing_events`; `POST /api/billing/checkout` (stub), `/webhook`, `/dev/billing/assign-plan`; grace/past_due state machine + banners. | migration, billing group | later |
| **M5 — Production provider** | Live provider layer behind explicit env check; webhook signature verify; startup guard. | env, provider adapter | later |

**Migration safety:** no backfill needed — absent `subscriptions` row ⇒ Free; existing exams/uploads/results untouched. New enums are `CREATE TYPE` (no `ADD VALUE` repeat hazard). Rollout order: ship M1 (observe-only) before M2 turns on enforcement, so quota display can be validated against real usage before it blocks anyone.

---

## 8. Test plan sketch

Vitest across packages; API service tests via `@effect/vitest` with real `Layer` composition (`Layer.succeed(Tag, fake)`), mocking only I/O boundaries. Tests live in `__test__/` next to code. TDD: RED → GREEN → REFACTOR.

| Area | Test | PRD DoD |
| ---- | ---- | ------- |
| Shared | `billing.ts` schemas decode/encode `EntitlementSummary`, `UsageBucket`; sentinel `limit=-1`. | §6.1 |
| `UsageService` | reserve→commit decrements once; reserve→release restores; period_key stable across month boundary; duplicate `source_ref` blocked. | §6.5, EC-A3/A5/A6 |
| `EntitlementService` | Free defaults with no row; Pro features unlock; grace still Pro; past_due falls back to Free; suspension overrides. | US-MON-4/8, EC-C1/C2/D5 |
| Generate handler | Free exhausted → `PLAN_LIMIT_EXCEEDED` (402) and **`AiClient` never invoked** (spy asserts zero calls); Free success decrements exactly once; async job commits once across N polls. | US-MON-3, EC-A3/A4 |
| Export handler | Free authenticated download → 403; owner-Free public download → 403; browser-print path unaffected. | US-MON-6, EC-B6 |
| PDF upload | Free `POST` → `FEATURE_GATED`; list/delete allowed. | US-MON-5 |
| Downgrade | Historical exam open/print/share succeeds regardless of plan. | US-MON-7, EC-B4 |
| Billing | webhook idempotent by `provider_event_id`; stub assign-plan flips entitlement; production startup guard fails without live env. | US-MON-9, EC-C4/E2 |
| Web | `_auth.generate.test.tsx` locked copy + disabled controls; entitlement refetch on 402/403. | §6.3/6.5 |
| Browser (mandatory) | Free generate→print until exhausted; Pro PDF/combine→export; no console errors. Uses `DEV_AUTH_ENABLED` + dev assign-plan. | §6.5 |

`pnpm lint && pnpm effect:check && pnpm type-check && pnpm test` must pass before shipping any phase.

---

## 9. Open questions

Carried from PRD A §7 plus RFC-implementation-level questions surfaced by the code seams.

| # | Question | Why it matters | Source |
| - | -------- | -------------- | ------ |
| Q1 | Rp49.000/bulan vs a lower intro school-year price? | Guru price sensitivity. | PRD §7 |
| Q2 | Which Indonesian provider first (Xendit / Midtrans / Duitku)? Determines M5 webhook + checkout shape. | Production billing. | PRD §7 |
| Q3 | Free one-time `pdf_guru` trial per account? | Conversion vs cost/abuse; would add a `trial_granted` flag on `subscriptions`. | PRD §7 |
| Q4 | Does public Bank Soal reuse become Pro later? | Affects `features.publicBankReuse` default. | PRD §7 |
| Q5 | Pro support channel: email vs WhatsApp Business? | Copy + ops. | PRD §7 |
| Q6 | Where does the **suspension/abuse** flag live — on `subscriptions`, `user`, or a separate table? PRD EC-D5 requires it to override entitlement but it must not read as a payment failure. | Determines EC-D5 precedence ordering. | RFC (EC-D5) |
| Q7 | For `ai_assist`, does **curriculum validation** count per-exam or per-run? A teacher may re-run "Periksa kurikulum" repeatedly. | Quota fairness + abuse. | RFC (PRD §3.2 ambiguity) |
| Q8 | Should the **idempotency key** for generate be a required client header or server-derived payload hash? Header is cleaner for two-tab dedupe; hash needs no client change. | EC-A5 robustness. | RFC |
| Q9 | On downgrade with `cancel_at_period_end`, do we hard-cap `maxQuestionsPerSheet` to 20 for *duplicating* an old 50-soal exam, or allow read-only duplication? PRD EC-B5 allows either — needs a product call. | EC-B5 behavior. | PRD EC-B5 |
| Q10 | Does the grace-sweep need a real scheduler, or is lazy computation in `EntitlementService.get` sufficient for MVP? Lazy is simpler but past_due rows never get a persisted status flip without a sweep. | Operational correctness. | RFC |

---

*This RFC specifies architecture only. No application code is implemented in this stage.*
