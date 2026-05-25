import { PgClient } from '@effect/sql-pg'
import { Effect, Layer, Redacted } from 'effect'

export const PgClientLive = Layer.unwrapEffect(
  Effect.sync(() => {
    const url = process.env['DATABASE_URL']
    if (!url) throw new Error('DATABASE_URL environment variable is not set')
    return PgClient.layer({ url: Redacted.make(url) })
  }),
)
