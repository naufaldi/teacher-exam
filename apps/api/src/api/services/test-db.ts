import { Layer, Effect } from 'effect'
import { SqlClient } from '@effect/sql/SqlClient'
import { DbClient, type AppDb } from './db'

export function createTestDbLayer(db: AppDb) {
  return Layer.succeed(DbClient, db)
}

export const TestSqlLayer = Layer.succeed(SqlClient, {
  withTransaction: <A, E, R>(self: Effect.Effect<A, E, R>) => self,
} as SqlClient)
