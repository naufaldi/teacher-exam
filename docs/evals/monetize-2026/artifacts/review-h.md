# Review H — Monetization v1 (Code E baseline)

**Branch:** `review-eval-model-h`
**Baseline:** PRD A + RFC C + Code E (`f57b11b`)
**Reviewer date:** 2026-07-11

---

## 1. Summary

**Verdict: fix-first**

The entitlement *read model* (M1) is solid: shared schemas, `subscriptions` table/migration, `EntitlementService`, `GET /api/me/entitlement`, and dashboard/generate UI plan badges are well-structured and tested. The foundation follows existing codebase patterns correctly.

However, the slice claims "generate path gated for quota / plan" but delivers only the `maxQuestionsPerSheet` cap. The two critical gates required by the PRD MVP (§6.6) are **not implemented**:

1. **`sheet_generate` quota enforcement** — `used` is hardcoded to 0; Free users can generate unlimited exams. No `UsageService`, no `usage_ledger`, no `PLAN_LIMIT_EXCEEDED` error.
2. **`sourceMode` feature gate** — Free users can submit `pdf_guru` / `combine` without being blocked, despite `features.pdfSourceModes === false`.

These are additive gaps (they slot into existing seams without rewrites), but they are MVP-blocking per PRD §6.6 #1–#3 and #5.

---

## 2. Findings table

| ID | Sev | Location | Issue | Suggested fix |
|----|-----|----------|-------|---------------|
| H1 | P0 | `entitlement-service.ts:61-70` | `usageBucket` hardcodes `used: 0, remaining: limit`. Quota never decrements. A Free user always sees "Sisa 3 dari 3" even after generating exams. PRD US-MON-1/3, §6.6 #1/#2/#5 require real counting. | Implement `UsageService` + `usage_ledger` (RFC §3.1/§4.1). Query `Σ amount WHERE state IN (reserved, committed)` per `(userId, action, periodKey)`. Wire into `EntitlementService.get`. |
| H2 | P0 | `ai.ts:25-56` | No `sheet_generate` quota exhaustion check before `generateExam`. PRD US-MON-3 requires `PLAN_LIMIT_EXCEEDED` (402) before `AiClient` is invoked. The `ApiPlanLimitExceeded` error class (RFC §4.10) is not defined anywhere. | Add `ApiPlanLimitExceeded` to `http.ts`. In the handler, call `EntitlementService.checkQuota("sheet_generate")`; if `remaining <= 0`, fail with `ApiPlanLimitExceeded` before `yield* AiClient`. |
| H3 | P0 | `ai.ts:25-56` | No `sourceMode` feature gate. RFC §4.3: "if `payload.sourceMode in (pdf_guru, combine)` and `not ent.features.pdfSourceModes`: fail `ApiFeatureGated`". A Free user can submit `sourceMode: "pdf_guru"` and the request proceeds to `generateExam`. | After fetching `summary`, check: `if ((payload.sourceMode === "pdf_guru" \|\| payload.sourceMode === "combine") && !summary.features.pdfSourceModes) → ApiFeatureGated`. |
| H4 | P1 | `http.ts` (entire file) | `ApiPlanLimitExceeded` (402, `PLAN_LIMIT_EXCEEDED`) is missing. RFC §4.10 specifies it with `action` and `resetAt` fields. Only `ApiFeatureGated` (403) was added. | Add `ApiPlanLimitExceeded extends Schema.TaggedError` with `code: Schema.Literal("PLAN_LIMIT_EXCEEDED")`, `action: UsageActionSchema`, `resetAt: Schema.String`, `HttpApiSchema.annotations({ status: 402 })`. Register in `AiGroup` errors. |
| H5 | P1 | `entitlement-service.ts:72-79` | `effectivePlan` trusts persisted `status` without lazy grace computation. RFC §4.9: "Grace transitions are computed lazily in `EntitlementService.get` (compare `now` vs `paidThrough + 3d`)". A row with `status: "active"` and an expired `paidThrough` still returns Pro. | Add lazy check: if `status === "active"` and `paidThrough` exists and `now > paidThrough`, compute grace; if `now > paidThrough + 3 days`, treat as `past_due` (Free fallback). |
| H6 | P1 | `ai.ts:19` + `billing-copy.ts:3` | `FREE_QUESTION_LIMIT_COPY` is duplicated in API and web. PRD §3.3 / RFC §5 say locked-state copy should be "sourced from shared constants". If one copy changes, users see inconsistent messages. | Move to `packages/shared` (e.g., `src/billing-copy.ts`) and import from both sides. The web side already has `billing-copy.ts`; export the constant from shared and re-export. |
| H7 | P1 | `0020_monetization_entitlements.sql` | Missing `usage_ledger` and `billing_events` tables (RFC §3.1). Only `subscriptions` is created. M2 (quota enforcement) and M4 (billing) cannot function without additional migrations. | Add `usage_ledger` table with `user_id`, `action` (enum), `state` (enum), `period_key`, `amount`, `source_ref`, timestamps, and a unique partial index on `(user_id, action, source_ref)`. Add `billing_events` with unique `provider_event_id`. |
| H8 | P2 | `ai.ts:28-29` | `EntitlementService.get` is called on every generate request, but it queries the DB for the subscription row. There's no caching layer. For a high-traffic generate endpoint, this adds a DB roundtrip per request. Acceptable for M1 but worth noting for M2. | Consider caching the subscription row with a short TTL (e.g., 30s) or memoizing within a request scope. Not urgent. |
| H9 | P2 | `entitlement-service.ts:20-38` | `FREE_FEATURES` and `PRO_FEATURES` are `as const` object literals used directly as `features` in the returned summary. If any consumer mutates the returned `EntitlementSummary`, these shared constants are corrupted. | Spread into a new object: `features: { ...FREE_FEATURES }` or use `Object.freeze`. Low risk since current consumers are read-only. |
| H10 | P2 | `entitlement-service.ts:46-48` | `periodKey` fallback logic uses `now.getUTCFullYear()` / `now.getUTCMonth()` if `Intl.DateTimeFormat` parts are missing. This fallback is practically unreachable (all runtimes support `en-CA` locale) but if hit, it uses UTC instead of Jakarta — a silent timezone bug. | Log a warning if the fallback fires, or throw (the `Intl` API is guaranteed by the runtime). |

---

## 3. Spec gaps (PRD/RFC vs code)

| Spec requirement | Status | Detail |
|-------------------|--------|--------|
| PRD §6.2 / RFC §4.3: `POST /api/ai/generate` reserves quota before `AiClient`, releases on failure | **Missing** | No `UsageService.reserve`/`commit`/`release`. No `usage_ledger` table. |
| PRD US-MON-3: Free quota exhaustion → `PLAN_LIMIT_EXCEEDED` before AI call | **Missing** | No `ApiPlanLimitExceeded` error. No quota check. AI is always invoked. |
| PRD US-MON-5 / RFC §4.3: `sourceMode in (pdf_guru, combine)` → `FEATURE_GATED` for Free | **Missing** | `features.pdfSourceModes` is `false` for Free but never checked in the handler. |
| PRD §6.1 / RFC §3.1: `usage_ledger` table with reservation/commit/release rows | **Missing** | Only `subscriptions` table exists. No `usage_ledger` or `billing_events`. |
| PRD §6.1 / RFC §3.3: `UsageAction`, `UsageState` enums in DB | **Missing** | Only `plan_code` and `subscription_status` enums added. `usage_action`, `usage_state` not created. |
| PRD §3.2 / RFC §4.5: `ai_assist` quota (regenerate, pembahasan, validate-curriculum) | **Missing** | Not claimed in slice. RFC marks as M3 (MVP). |
| PRD US-MON-6 / RFC §4.6: Export download gating (authenticated + public owner check) | **Missing** | Not claimed in slice. RFC marks as M3 (MVP). |
| PRD US-MON-5 / RFC §4.7: PDF upload gating | **Missing** | Not claimed in slice. RFC marks as M3 (MVP). |
| RFC §4.9: Lazy grace computation (`now` vs `paidThrough + 3d`) | **Partial** | Status is read from DB but not computed lazily. |
| PRD §6.4 / RFC §4.9: Billing boundary (stub + `billing_events`) | **Missing** | Not claimed in slice. RFC marks as M4 (later). |
| RFC §4.10: `ApiPlanLimitExceeded` (402) with `action` + `resetAt` fields | **Missing** | Only `ApiFeatureGated` (403) added. |
| RFC §5: Indonesian locked-state copy from shared `billing-copy.ts` | **Partial** | Web side has `billing-copy.ts`. API side duplicates `FREE_QUESTION_LIMIT_COPY` in `ai.ts:19`. |

---

## 4. Test gaps

| Test | Status | Why it matters |
|------|--------|----------------|
| Free quota exhausted → `PLAN_LIMIT_EXCEEDED` (402), AI not called | **Missing** | PRD US-MON-3, §6.5. Cannot test because quota enforcement isn't implemented. |
| Free `sourceMode: "pdf_guru"` → `FEATURE_GATED` (403) | **Missing** | PRD US-MON-5, RFC §4.3. Cannot test because source mode gate isn't implemented. |
| `UsageService` reserve → commit decrements once | **Missing** | RFC §8, EC-A3/A5/A6. No `UsageService` exists. |
| `UsageService` reserve → release restores quota | **Missing** | EC-A3. |
| Async job commits quota once across N polls | **Missing** | EC-A4. |
| Grace → Pro still active; past_due → Free fallback | **Missing** | US-MON-8, EC-C1/C2. `effectivePlan` logic is untested for grace/past_due transitions. |
| Pro `sourceMode: "pdf_guru"` succeeds | **Missing** | US-MON-4. `buildProTestApp` exists in test setup but no test uses it for source mode. |
| Entitlement refetch on 402/403 (web) | **Missing** | EC-B3. Web client doesn't refresh entitlement on gated errors. |

**Tests that exist and are good:**
- `billing.test.ts`: Free/Pro decode, `-1` sentinel, unknown plan rejection ✓
- `entities.test.ts`: `SubscriptionIdSchema` brands ✓
- `subscriptions.test.ts`: table constraints, enum values, migration SQL, journal registration ✓
- `entitlement.test.ts`: Free (no row) and Pro (active row) via live `EntitlementService` ✓
- `ai.generate.test.ts`: Free >20 questions → 403 `FEATURE_GATED`, AI not called ✓
- `_auth.dashboard.test.tsx`: plan badge "Free" + "Sisa 2 dari 3" copy ✓
- `_auth.generate.test.tsx`: quota copy, `max` attribute, Pro 50-question cap, 25-soal UAS auto-fill ✓
- `api.test.ts`: `api.me.entitlement` decodes `EntitlementSummarySchema` ✓

---

## 5. What looks solid

- **Shared schemas** (`billing.ts`) match RFC §3.3 exactly — `PlanCode`, `SubscriptionStatus`, `UsageAction`, `UsageBucket` (with `-1` sentinel for fair-use), `EntitlementSummary` with all 7 feature flags. Both Schema and Type exported per convention.
- **Branded `SubscriptionIdSchema`** in `entities.ts` follows the branding rule. `brandSubscriptionId` helper added.
- **DB migration** (`0020`) is additive: `CREATE TYPE` for new enums (no `ADD VALUE` repeat hazard), `subscriptions` table FK'd to `user.id` with `ON DELETE cascade`, unique on `user_id` (one active plan per guru). Properly registered in migration journal.
- **`EntitlementService`** follows the existing `Layer.effect` + `Effect.provideService(DbClient, db)` pattern used by `BankServiceLive` and others. Correctly composed in `AppLayer.ts` via `EntitlementServiceWithDbLive`.
- **`GET /api/me/entitlement`** endpoint is correctly defined in `EntitlementGroup` (with `Authorization` + `GlobalRateLimit` middleware), implemented in `EntitlementLive`, and added to `TeacherExamApi` definition. Mirrors the existing `MeGroup` pattern.
- **`ApiFeatureGated` error** (403, `FEATURE_GATED`) is correctly defined with `HttpApiSchema.annotations({ status: 403 })` and registered in `AiGroup` errors.
- **Dashboard UI** shows plan badge (`Free`/`Pro Guru`) and sheet quota copy (`Sisa N dari M lembar bulan ini`) from the server-returned entitlement, not client-side constants.
- **Generate UI** clamps `totalSoal` `max` attribute to `maxQuestionsPerSheet`, shows `FREE_QUESTION_LIMIT_COPY` for Free, and auto-fills 25 for UAS when Pro. The `entitlementLimitApplied` guard prevents resetting after manual entry.
- **Jakarta timezone math** (`periodKey`, `nextJakartaMonthStartIso`) correctly uses `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })` for `YYYY-MM` keys and `+07:00` ISO reset dates.
- **Test infrastructure** properly extended: `test-harness.ts` supports both a default fake entitlement and `useLiveEntitlement: true` for real `EntitlementServiceLive` tests. `mock-db.ts` and `ai-setup.ts` extended with subscription mocks and `PRO_ENTITLEMENT` fixture.
- **Existing tests updated** to use `buildProTestApp()` where >20 questions are needed (`ai.generate-composition.test.ts`, `ai.generate-extended.test.ts`), avoiding false failures from the new 20-question Free cap.

---

## 6. Recommendation

The M1 read model is production-quality. Before this slice can be called "MVP generate path gated", the following must land (in priority order):

1. **H2 + H4**: Add `ApiPlanLimitExceeded` and the `sheet_generate` quota check in `ai.ts` before `AiClient`.
2. **H3**: Add the `sourceMode` feature gate in `ai.ts`.
3. **H1 + H7**: Implement `UsageService` + `usage_ledger` migration so `used`/`remaining` reflect real state.
4. **H5**: Add lazy grace computation in `effectivePlan`.
5. **H6**: Share `FREE_QUESTION_LIMIT_COPY` from `packages/shared`.

Items 1–3 are the difference between "entitlement display" and "entitlement enforcement" — the PRD MVP requires the latter.
