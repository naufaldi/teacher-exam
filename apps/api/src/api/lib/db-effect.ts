import { Effect } from 'effect'
import { SqlError } from '@effect/sql/SqlError'
import { ApiDatabaseError } from '../errors/http'
import { DbClient } from '../services/db'

export function runDb<A>(
  query: Effect.Effect<A, SqlError, DbClient>,
): Effect.Effect<A, ApiDatabaseError, DbClient> {
  return query.pipe(
    Effect.catchTag('SqlError', (e) =>
      Effect.fail(new ApiDatabaseError({ error: e.message, code: 'DATABASE_ERROR' })),
    ),
  )
}
