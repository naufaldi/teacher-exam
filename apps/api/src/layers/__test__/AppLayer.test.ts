import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { BankService } from "../../api/services/bank-service"

describe("AppLayer service tags", () => {
  it.effect("BankService tag is available for typed access", () =>
    Effect.sync(() => {
      assert.strictEqual(BankService.key, "BankService")
    }))
})
