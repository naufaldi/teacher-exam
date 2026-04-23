import { Hono } from 'hono'
import { Schema } from 'effect'
import { eq, and, ne } from 'drizzle-orm'
import { db, user } from '@teacher-exam/db'
import {
  UpdateProfileInputSchema,
  type UserProfile,
  type UpdateProfileInput,
  type Grade,
} from '@teacher-exam/shared'

export const meRouter = new Hono()

meRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const profile = await loadProfile(userId)
  if (!profile) return c.json({ error: 'User not found' }, 404)
  return c.json(profile)
})

meRouter.patch('/', async (c) => {
  const userId = c.get('userId')

  const body = await c.req.json().catch(() => null)
  if (body === null) return c.json({ error: 'Invalid JSON body' }, 400)

  const decode = Schema.decodeUnknownEither(UpdateProfileInputSchema)
  const parsed = decode(body)
  if (parsed._tag === 'Left') {
    return c.json({ error: 'Validation failed', details: String(parsed.left) }, 400)
  }
  const input: UpdateProfileInput = parsed.right

  if (input.username !== undefined) {
    const taken = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.username, input.username), ne(user.id, userId)))
      .limit(1)
    if (taken.length > 0) return c.json({ error: 'Username taken' }, 409)
  }

  const current = await loadProfile(userId)
  if (!current) return c.json({ error: 'User not found' }, 404)

  const merged = { ...current, ...input }
  const profileCompleted = Boolean(
    merged.username && merged.school && merged.gradesTaught?.length && merged.subjectsTaught?.length,
  )

  await db
    .update(user)
    .set({
      ...input,
      gradesTaught: input.gradesTaught ? [...input.gradesTaught] : undefined,
      subjectsTaught: input.subjectsTaught ? [...input.subjectsTaught] : undefined,
      profileCompleted,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  const updated = await loadProfile(userId)
  if (!updated) return c.json({ error: 'User not found' }, 404)
  return c.json(updated)
})

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  const row = rows[0]
  if (!row) return null

  return {
    id:               row.id,
    email:            row.email,
    name:             row.name,
    username:         row.username,
    image:            row.image,
    school:           row.school,
    gradesTaught:     row.gradesTaught as Grade[] | null,
    subjectsTaught:   row.subjectsTaught,
    profileCompleted: row.profileCompleted,
    locale:           row.locale,
    timezone:         row.timezone,
  }
}
