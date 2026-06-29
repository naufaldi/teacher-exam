## Summary

<!-- What changed and why -->

## Tracking

- Closes #<!-- issue number -->
- Milestone: <!-- M1–M6 or RFC-E1–E5 -->
- [ ] `docs/ISSUE_INDEX.md` row exists or updated

## Checklist

- [ ] `pnpm lint && pnpm effect:check && pnpm type-check && pnpm test`
- [ ] Root `effect` imports only (no `effect/Function`, no `flow`, no `import * as` from `"effect"`)
- [ ] `@effect/platform` / `@effect/sql` use subpath imports (no barrel)
- [ ] `Effect.gen` for pipelines with 3+ steps or branching
- [ ] `Match.exhaustive` for tagged unions (not `switch` on `_tag`)
- [ ] Schema-first types; branded IDs for new entity PKs
- [ ] Web API responses decoded with shared Schema before use
- [ ] New API services registered in `apps/api/src/layers/AppLayer.ts`

## Test plan

<!-- Steps to verify -->
