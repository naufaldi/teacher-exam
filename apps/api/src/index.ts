import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './lib/auth'
import { requireAuth } from './middleware/auth'
import { healthRouter } from './routes/health'
import { meRouter } from './routes/me'

const app = new Hono()

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: process.env['APP_URL'] ?? 'http://localhost:3000',
    credentials: true,
  }),
)

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/api/health', healthRouter)

app.use('/api/*', requireAuth)

app.route('/api/me', meRouter)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = Number(process.env['API_PORT'] ?? 3001)

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})

const shutdown = () => {
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
