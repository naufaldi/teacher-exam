import * as PgDrizzle from "@effect/sql-drizzle/Pg"
import * as schema from "@teacher-exam/db/schema"
import type { PgRemoteDatabase } from "drizzle-orm/pg-proxy"
import { Context, Effect, Layer } from "effect"
import { AppConfigLive } from "./app-config"
import { PgClientLive } from "./pg-client"

export type AppDb = PgRemoteDatabase<typeof schema>

export class DbClient extends Context.Tag("DbClient")<DbClient, AppDb>() {}

const PgDrizzleLayer = Layer.effect(
  DbClient,
  Effect.map(
    PgDrizzle.makeWithConfig(
      { schema: schema as Record<string, unknown> } as Parameters<typeof PgDrizzle.makeWithConfig>[0]
    ),
    (db) => db as unknown as AppDb
  )
)

export const DbLayer = PgDrizzleLayer.pipe(
  Layer.provideMerge(PgClientLive),
  Layer.provide(AppConfigLive),
  Layer.orDie
)
