import { eq } from 'drizzle-orm'
import { db, user } from '@teacher-exam/db'

const USERNAME_RE = /[^a-z0-9._-]/g

/**
 * Derive a stable, URL-safe username from a Google email and ensure it
 * is unique in the `user` table by appending `-2`, `-3`, ... on collision.
 */
export async function deriveUniqueUsername(email: string): Promise<string> {
  const local = (email.split('@')[0] ?? 'user').toLowerCase().replace(USERNAME_RE, '')
  const base = local.length >= 3 ? local.slice(0, 32) : `user${local}`.slice(0, 32)

  let candidate = base
  let suffix = 2
  while (await usernameExists(candidate)) {
    const tail = `-${suffix}`
    candidate = `${base.slice(0, 32 - tail.length)}${tail}`
    suffix += 1
    if (suffix > 9999) throw new Error('Could not derive unique username')
  }
  return candidate
}

async function usernameExists(candidate: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.username, candidate)).limit(1)
  return rows.length > 0
}
