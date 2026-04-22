import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@teacher-exam/db'

export const auth = betterAuth({
  secret: process.env['SESSION_SECRET'] ?? '',
  baseURL: process.env['APP_URL'] ?? 'http://localhost:3000',
  database: drizzleAdapter(db, { provider: 'pg' }),
  socialProviders: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 30 },
  },
})
