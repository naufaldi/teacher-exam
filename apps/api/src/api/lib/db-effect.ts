import { Effect } from 'effect'
import { ApiDatabaseError } from '../errors/http'

export function tryDb<A>(run: () => Promise<A>): Effect.Effect<A, ApiDatabaseError> {
  return Effect.tryPromise({
    try: run,
    catch: () => new ApiDatabaseError({ error: 'Database error', code: 'DATABASE_ERROR' }),
  })
}
