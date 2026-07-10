# Code E notes (slot E — GPT 5.5)

## Slice
MVP entitlement + Free/Pro gates per RFC C / PRD A:
- shared `billing` schemas + subscription tables/migration
- `EntitlementService` + `GET` entitlement API
- generate path gated for quota / plan
- dashboard + generate UI plan/quota copy

## Key paths
- `packages/shared/src/schemas/billing.ts`
- `packages/db/src/schema/subscriptions.ts`
- `packages/db/src/migrations/0020_monetization_entitlements.sql`
- `apps/api/src/api/services/entitlement-service.ts`
- `apps/api/src/api/handlers/entitlement.ts`
- `apps/api/src/api/handlers/ai.ts` (gates)
- `apps/web/src/routes/_auth.dashboard.tsx`
- `apps/web/src/routes/_auth.generate.tsx`
- `apps/web/src/lib/billing-copy.ts`

## Not included in commit
- Accidental wipe of `bank-soal-publik.tsx` was reverted (unrelated).

## Verification
Record type-check/tests on eval-ops when scoring Code stage.
