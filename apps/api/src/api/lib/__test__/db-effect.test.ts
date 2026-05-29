import { SqlError } from "@effect/sql/SqlError"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { ApiDatabaseError } from "../../errors/http.js"
import { DbClient } from "../../services/db.js"
import { runDb } from "../db-effect.js"

describe("runDb", () => {
  it("passes through successful query results", async () => {
    const result = await Effect.runPromise(
      runDb(Effect.succeed(["row"])).pipe(
        Effect.provide(Layer.succeed(DbClient, {} as never))
      )
    )
    expect(result).toEqual(["row"])
  })

  it("maps SqlError to ApiDatabaseError", async () => {
    const err = new SqlError({ cause: new Error("boom"), message: "boom" })
    const result = await Effect.runPromise(
      runDb(Effect.fail(err)).pipe(
        Effect.either,
        Effect.provide(Layer.succeed(DbClient, {} as never))
      )
    )
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ApiDatabaseError)
      expect(result.left.error).toBe("boom")
    }
  })
})
