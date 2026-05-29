import type { SqlError } from "@effect/sql/SqlError"
import { Effect } from "effect"
import { ApiDatabaseError } from "../errors/http"
import type { DbClient } from "../services/db"
import { withDbSpan } from "../telemetry"

export function runDb<A>(
  query: Effect.Effect<A, SqlError, DbClient>
): Effect.Effect<A, ApiDatabaseError, DbClient> {
  return withDbSpan(
    "db.query",
    query.pipe(
      Effect.catchTag(
        "SqlError",
        (e) => Effect.fail(new ApiDatabaseError({ error: e.message, code: "DATABASE_ERROR" }))
      )
    )
  )
}
