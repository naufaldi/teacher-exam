import { PgClient } from "@effect/sql-pg"
import { Effect, Layer, Redacted } from "effect"
import { AppConfig } from "./app-config"

export const PgClientLive = Layer.unwrapEffect(
  Effect.gen(function*() {
    const config = yield* AppConfig
    return PgClient.layer({ url: Redacted.make(config.databaseUrl) })
  })
)
