import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { DbClient, DbLayer } from "../db.js"
import { TestSqlLayer } from "../test-db.js"

const TestDbLayer = Layer.succeed(DbClient, db as never)

describe("DbLayer", () => {
  it("TestDbLayer provides DbClient for handler tests", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function*() {
        const client = yield* DbClient
        return typeof client.select
      }).pipe(Effect.provide(Layer.mergeAll(TestDbLayer, TestSqlLayer)))
    )
    expect(result).toBe("function")
  })

  it("DbLayer is a Layer", () => {
    expect(DbLayer).toBeDefined()
  })
})
