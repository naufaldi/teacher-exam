import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './lib/auth.js'
import { healthRouter } from './routes/health.js'

const app = new Hono()

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: process.env['BETTER_AUTH_URL'] === 'http://localhost:3001'
      ? 'http://localhost:5173'
      : process.env['WEB_URL'] ?? '',
    credentials: true,
  }),
)

// better-auth handles all /api/auth/* routes
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/api/health', healthRouter)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = Number(process.env['PORT'] ?? 3001)
console.log(`API server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
