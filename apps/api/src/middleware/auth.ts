import type { MiddlewareHandler } from 'hono'
import { auth } from '../lib/auth'

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('userId', session.user.id)
  await next()
}

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
  }
}
