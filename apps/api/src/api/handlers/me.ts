import { HttpApiBuilder } from '@effect/platform'
import { Effect, Schema } from 'effect'
import { eq, and, ne } from 'drizzle-orm'
import { db, user } from '@teacher-exam/db'
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
} from '../errors/http'
import { CurrentUser } from '../middleware/auth'
import { tryDb } from '../lib/db-effect'

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1)
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
}

export const MeLive = HttpApiBuilder.group(TeacherExamApi, 'me', (handlers) =>
  handlers
    .handle('getMe', () =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const profile = yield* tryDb(() => loadProfile(userId))
        if (!profile) {
          return yield* Effect.fail(new ApiUserNotFound({ error: 'User not found' }))
        }
        return profile
      }),
    )
    .handle('patchMe', ({ payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
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
          const taken = yield* tryDb(() =>
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

        const current = yield* tryDb(() => loadProfile(userId))
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

        yield* tryDb(() =>
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

        const updated = yield* tryDb(() => loadProfile(userId))
        if (!updated) {
          return yield* Effect.fail(new ApiUserNotFound({ error: 'User not found' }))
        }
        return updated
      }),
    ),
)
