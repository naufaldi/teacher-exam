import { Context, Effect, Layer, ManagedRuntime } from 'effect'
import { SqlClient } from '@effect/sql/SqlClient'
import { DbClient, DbLayer, type AppDb } from './db'

type DatabaseServices = DbClient | SqlClient

export const databaseRuntime = ManagedRuntime.make(DbLayer)

let sharedContext: Context.Context<DatabaseServices> | undefined

export async function startDatabase(): Promise<AppDb> {
  if (sharedContext) {
    return Context.get(sharedContext, DbClient)
  }

  sharedContext = await databaseRuntime.runPromise(
    Effect.gen(function* () {
      yield* DbClient
      return yield* Effect.context<DatabaseServices>()
    }),
  )

  return Context.get(sharedContext, DbClient)
}

export function getSharedDatabaseLayer(): Layer.Layer<DatabaseServices> {
  if (!sharedContext) {
    throw new Error('Database not started — call startDatabase() before creating the HTTP handler')
  }
  return Layer.succeedContext(sharedContext)
}

export async function disposeDatabase(): Promise<void> {
  sharedContext = undefined
  await databaseRuntime.dispose()
}
