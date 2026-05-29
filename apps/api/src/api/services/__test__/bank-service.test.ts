import { assert, describe, it } from "@effect/vitest"
import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { type Mock } from "vitest"
import { makeChain } from "../../../routes/__test__/helpers"
import { BankService, BankServiceLive } from "../bank-service"
import { DbClient } from "../db"

describe("BankServiceLive", () => {
  it.effect("browseOwn does not require DbClient from the caller", () =>
    Effect.gen(function*() {
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) {
          return makeChain([{ count: 0 }])
        }
        return makeChain([])
      })

      const bankService = yield* BankService
      const result = yield* bankService.browseOwn("test-user-id", {})
      assert.strictEqual(result.total, 0)
      assert.strictEqual(result.data.length, 0)
    }).pipe(Effect.provide(Layer.provide(BankServiceLive, Layer.succeed(DbClient, db as never)))))
})
