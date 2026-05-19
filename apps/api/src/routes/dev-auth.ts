import { Hono } from 'hono'
import { auth } from '../lib/auth'
import {
  DevAuthForbiddenError,
  assertDevAuthAllowed,
  getDevCredentials,
} from '../lib/dev-auth'

export const devAuthRouter = new Hono()

devAuthRouter.post('/login', async (c) => {
  try {
    assertDevAuthAllowed(c.req.header('host') ?? '')
  } catch (err) {
    if (err instanceof DevAuthForbiddenError) {
      return c.json({ error: 'Forbidden', message: 'Dev auth is not available' }, 403)
    }
    throw err
  }

  const { email, password } = getDevCredentials()
  const upstream = await auth.api.signInEmail({
    body: { email, password },
    headers: c.req.raw.headers,
    asResponse: true,
  })

  if (!upstream.ok) {
    const body = await upstream.text()
    return c.body(body, upstream.status as 401 | 400 | 500, {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    })
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('Content-Type')
  if (contentType !== null) {
    headers.set('Content-Type', contentType)
  }
  const setCookie = upstream.headers.get('Set-Cookie')
  if (setCookie !== null) {
    headers.set('Set-Cookie', setCookie)
  }

  const body = await upstream.text()
  return new Response(body, { status: 200, headers })
})
