import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) throw new Error('DATABASE_URL environment variable is not set')

const queryClient = postgres(DATABASE_URL)
export const db = drizzle(queryClient, { schema })
export type Db = typeof db
