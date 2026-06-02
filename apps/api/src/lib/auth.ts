import { account, session, user, verification } from "@teacher-exam/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { runDb } from "../api/lib/db-effect"
import { readAppConfigFromEnv } from "../api/services/app-config"
import { runAuthDbEffect } from "../api/services/auth-service"
import type { AppDb } from "../api/services/db"
import { resolveAuthBaseURL, resolveTrustedOrigins } from "./auth-origins"
import { isDevAuthEnabled } from "./dev-auth"
import { deriveUniqueUsername } from "./username"

type AuthInstance = ReturnType<typeof betterAuth>

let authInstance: AuthInstance | undefined
let authDb: AppDb | undefined

export function initAuth(db: AppDb): AuthInstance {
  authDb = db
  const config = readAppConfigFromEnv()
  authInstance = betterAuth({
    secret: config.sessionSecret,
    baseURL: resolveAuthBaseURL(),
    trustedOrigins: resolveTrustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification }
    }),
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret
      }
    },
    ...(isDevAuthEnabled()
      ? {
        emailAndPassword: {
          enabled: true,
          disableSignUp: true
        }
      }
      : {}),
    session: {
      cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 30 }
    },
    user: {
      additionalFields: {
        username: { type: "string", required: true, input: false },
        school: { type: "string", required: false },
        gradesTaught: { type: "number[]", required: false },
        subjectsTaught: { type: "string[]", required: false },
        profileCompleted: { type: "boolean", required: false, defaultValue: false, input: false },
        locale: { type: "string", required: false, defaultValue: "id-ID" },
        timezone: { type: "string", required: false, defaultValue: "Asia/Jakarta" },
        lastLoginAt: { type: "date", required: false, input: false }
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            const username = await runAuthDbEffect(
              db,
              deriveUniqueUsername(data.email)
            )
            return { data: { ...data, username } }
          }
        }
      },
      session: {
        create: {
          after: async (created) => {
            await runAuthDbEffect(
              db,
              runDb(
                db
                  .update(user)
                  .set({ lastLoginAt: new Date() })
                  .where(eq(user.id, created.userId))
              )
            )
          }
        }
      }
    }
  }) as unknown as AuthInstance
  return authInstance
}

export function getAuth(): AuthInstance {
  if (!authInstance) {
    throw new Error("Auth not initialized — call initAuth() at startup")
  }
  return authInstance
}

export function getAuthDb(): AppDb {
  if (!authDb) {
    throw new Error("Auth DB not initialized — call initAuth() at startup")
  }
  return authDb
}

export const auth: {
  readonly api: AuthInstance["api"]
  readonly handler: AuthInstance["handler"]
} = {
  get api() {
    return getAuth().api
  },
  get handler() {
    return getAuth().handler
  }
}
