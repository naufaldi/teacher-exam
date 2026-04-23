import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db, user, session, account, verification } from '@teacher-exam/db'
import { deriveUniqueUsername } from './username'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

const SESSION_SECRET     = requireEnv('SESSION_SECRET')
const GOOGLE_CLIENT_ID   = requireEnv('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = requireEnv('GOOGLE_CLIENT_SECRET')
const APP_URL            = process.env['APP_URL'] ?? 'http://localhost:3000'

export const auth = betterAuth({
  secret: SESSION_SECRET,
  baseURL: APP_URL,
  trustedOrigins: [APP_URL],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
  },
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
          const username = await deriveUniqueUsername(data.email)
          return { data: { ...data, username } }
        },
      },
    },
    session: {
      create: {
        after: async (created) => {
          await db
            .update(user)
            .set({ lastLoginAt: new Date() })
            .where(eq(user.id, created.userId))
        },
      },
    },
  },
})
