import { Layer, Context } from 'effect'
import { db, type Db } from '@teacher-exam/db'

export class DbClient extends Context.Tag('DbClient')<DbClient, Db>() {}

export const DbLayer = Layer.succeed(DbClient, db)
