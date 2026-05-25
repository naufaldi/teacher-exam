import { HttpApiBuilder } from '@effect/platform'
import { Effect, Schema } from 'effect'
import { eq, and, ne } from 'drizzle-orm'
import { user } from '@teacher-exam/db'
import {
  UpdateProfileInputSchema,
  type UserProfile,
  type UpdateProfileInput,
  type Grade,
} from '@teacher-exam/shared'
import { TeacherExamApi } from '../definition'
import {
  ApiConflict,
  ApiUserNotFound,
  ApiValidationError400,
  ApiDatabaseError,
} from '../errors/http'
import { CurrentUser } from '../middleware/auth'
import { runDb } from '../lib/db-effect'
import { DbClient } from '../services/db'

function loadProfile(userId: string): Effect.Effect<UserProfile | null, ApiDatabaseError, DbClient> {
  return Effect.gen(function* () {
    const db = yield* DbClient
    const rows = yield* runDb(db.select().from(user).where(eq(user.id, userId)).limit(1))
    const row = rows[0]
    if (!row) return null

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      username: row.username,
      image: row.image,
      school: row.school,
      gradesTaught: row.gradesTaught as Grade[] | null,
      subjectsTaught: row.subjectsTaught,
      profileCompleted: row.profileCompleted,
      locale: row.locale,
      timezone: row.timezone,
    }
  })
}

export const MeLive = HttpApiBuilder.group(TeacherExamApi, 'me', (handlers) =>
  handlers
    .handle('getMe', () =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const profile = yield* loadProfile(userId)
        if (!profile) {
          return yield* Effect.fail(new ApiUserNotFound({ error: 'User not found' }))
        }
        return profile
      }),
    )
    .handle('patchMe', ({ payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const db = yield* DbClient
        const decode = Schema.decodeUnknownEither(UpdateProfileInputSchema)
        const parsed = decode(payload)
        if (parsed._tag === 'Left') {
          return yield* Effect.fail(
            new ApiValidationError400({
              error: 'Validation failed',
              details: String(parsed.left),
            }),
          )
        }
        const input: UpdateProfileInput = parsed.right

        if (input.username !== undefined) {
          const taken = yield* runDb(
            db
              .select({ id: user.id })
              .from(user)
              .where(and(eq(user.username, input.username!), ne(user.id, userId)))
              .limit(1),
          )
          if (taken.length > 0) {
            return yield* Effect.fail(new ApiConflict({ error: 'Username taken' }))
          }
        }

        const current = yield* loadProfile(userId)
        if (!current) {
          return yield* Effect.fail(new ApiUserNotFound({ error: 'User not found' }))
        }

        const merged = { ...current, ...input }
        const profileCompleted = Boolean(
          merged.username &&
            merged.school &&
            merged.gradesTaught?.length &&
            merged.subjectsTaught?.length,
        )

        yield* runDb(
          db
            .update(user)
            .set({
              ...input,
              gradesTaught: input.gradesTaught ? [...input.gradesTaught] : undefined,
              subjectsTaught: input.subjectsTaught ? [...input.subjectsTaught] : undefined,
              profileCompleted,
              updatedAt: new Date(),
            })
            .where(eq(user.id, userId)),
        )

        const updated = yield* loadProfile(userId)
        if (!updated) {
          return yield* Effect.fail(new ApiUserNotFound({ error: 'User not found' }))
        }
        return updated
      }),
    ),
)
