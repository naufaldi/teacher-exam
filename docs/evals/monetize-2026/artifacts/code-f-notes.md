# Code F notes (slot F — Kimi K2.7)

## Slice
RFC C / PRD A monetize MVP:
- billing schemas, subscriptions + usage_ledger
- EntitlementService, UsageService, BillingService
- generate gating + me/dev-auth entitlement surfaces
- dashboard plan UI + billing API client

## Key paths
- `packages/shared/src/schemas/billing.ts`
- `packages/db/src/schema/subscriptions.ts`, `usage-ledger.ts`
- `packages/db/src/migrations/0020_add_monetization_tables.sql`
- `apps/api/src/api/services/{entitlement,usage,billing}-service.ts`
- `apps/api/src/api/handlers/{ai,me,dev-auth}.ts`
- `apps/web/src/lib/api/billing.ts`
- `apps/web/src/routes/_auth.dashboard.tsx`

## Verification
Record type-check/tests on eval-ops when scoring Code stage.
