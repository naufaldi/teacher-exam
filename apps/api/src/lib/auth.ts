import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { Effect, Layer } from 'effect'
import { user, session, account, verification } from '@teacher-exam/db'
import type { AppDb } from '../api/services/db'
import { DbClient } from '../api/services/db'
import { runDb } from '../api/lib/db-effect'
import { deriveUniqueUsername } from './username'
import { resolveAuthBaseURL, resolveTrustedOrigins } from './auth-origins'
import { isDevAuthEnabled } from './dev-auth'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

const GOOGLE_CLIENT_ID     = () => requireEnv('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = () => requireEnv('GOOGLE_CLIENT_SECRET')
const BETTER_AUTH_URL      = () => resolveAuthBaseURL()

type AuthInstance = ReturnType<typeof betterAuth>

let authInstance: AuthInstance | undefined
let authDb: AppDb | undefined

export function initAuth(db: AppDb): AuthInstance {
  authDb = db
  authInstance = betterAuth({
    secret: requireEnv('SESSION_SECRET'),
    baseURL: BETTER_AUTH_URL(),
    trustedOrigins: resolveTrustedOrigins(),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    socialProviders: {
      google: {
        clientId: GOOGLE_CLIENT_ID(),
        clientSecret: GOOGLE_CLIENT_SECRET(),
      },
    },
    ...(isDevAuthEnabled()
      ? {
          emailAndPassword: {
            enabled: true,
            disableSignUp: true,
          },
        }
      : {}),
    session: {
      cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 30 },
    },
    user: {
      additionalFields: {
        username:         { type: 'string',   required: true,  input: false },
        school:           { type: 'string',   required: false },
        gradesTaught:     { type: 'number[]', required: false },
        subjectsTaught:   { type: 'string[]', required: false },
        profileCompleted: { type: 'boolean',  required: false, defaultValue: false, input: false },
        locale:           { type: 'string',   required: false, defaultValue: 'id-ID' },
        timezone:         { type: 'string',   required: false, defaultValue: 'Asia/Jakarta' },
        lastLoginAt:      { type: 'date',     required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            const username = await Effect.runPromise(
              deriveUniqueUsername(data.email).pipe(
                Effect.provide(Layer.succeed(DbClient, db)),
              ),
            )
            return { data: { ...data, username } }
          },
        },
      },
      session: {
        create: {
          after: async (created) => {
            await Effect.runPromise(
              runDb(
                db
                  .update(user)
                  .set({ lastLoginAt: new Date() })
                  .where(eq(user.id, created.userId)),
              ).pipe(Effect.provide(Layer.succeed(DbClient, db))),
            )
          },
        },
      },
    },
  }) as unknown as AuthInstance
  return authInstance
}

export function getAuth(): AuthInstance {
  if (!authInstance) {
    throw new Error('Auth not initialized — call initAuth() at startup')
  }
  return authInstance
}

export function getAuthDb(): AppDb {
  if (!authDb) {
    throw new Error('Auth DB not initialized — call initAuth() at startup')
  }
  return authDb
}

export const auth = {
  get api() {
    return getAuth().api
  },
  get handler() {
    return getAuth().handler
  },
}
