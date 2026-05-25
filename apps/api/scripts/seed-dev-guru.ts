import { eq } from 'drizzle-orm'
import { Effect, Layer } from 'effect'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { user, session, account, verification } from '@teacher-exam/db'
import { startDatabase } from '../src/api/services/bootstrap-db.js'
import { DbClient } from '../src/api/services/db.js'
import { deriveUniqueUsername } from '../src/lib/username.js'
import { runDb } from '../src/api/lib/db-effect.js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

async function main() {
  if (process.env['DEV_AUTH_ENABLED'] !== 'true') {
    throw new Error('Set DEV_AUTH_ENABLED=true in .env before running db:seed:dev')
  }

  const db = await startDatabase()
  const dbLayer = Layer.succeed(DbClient, db)

  const email = requireEnv('DEV_AUTH_EMAIL')
  const password = requireEnv('DEV_AUTH_PASSWORD')
  const secret = requireEnv('SESSION_SECRET')
  const apiPort = process.env['API_PORT'] ?? '3000'

  const seedAuth = betterAuth({
    secret,
    baseURL: `http://localhost:${apiPort}`,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
    },
    user: {
      additionalFields: {
        username:         { type: 'string',   required: true,  input: true },
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
              deriveUniqueUsername(data.email).pipe(Effect.provide(dbLayer)),
            )
            return { data: { ...data, username } }
          },
        },
      },
    },
  })

  const existing = await Effect.runPromise(
    runDb(db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)).pipe(
      Effect.provide(dbLayer),
    ),
  )

  if (existing.length === 0) {
    const signedUp = await seedAuth.api.signUpEmail({
      body: { email, password, name: 'Guru Dev', username: 'guru.dev' },
    })
    if (signedUp === null || signedUp.user === undefined) {
      throw new Error('signUpEmail did not return a user — check DATABASE_URL and credentials')
    }
    console.log(`Created dev user ${email}`)
  } else {
    console.log(`Dev user ${email} already exists — updating profile only`)
  }

  await Effect.runPromise(
    runDb(
      db
        .update(user)
        .set({
          username: 'guru.dev',
          name: 'Guru Dev',
          school: 'SDN Dev',
          gradesTaught: [5, 6],
          subjectsTaught: [
            'bahasa_indonesia',
            'pendidikan_pancasila',
            'ipas',
            'bahasa_inggris',
          ],
          profileCompleted: true,
          emailVerified: true,
        })
        .where(eq(user.email, email)),
    ).pipe(Effect.provide(dbLayer)),
  )

  console.log('Dev guru profile ready (profileCompleted=true, 4 mapel)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
