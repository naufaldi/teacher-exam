import { serve } from '@hono/node-server'
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
    origin: process.env['APP_URL'] ?? 'http://localhost:3000',
    credentials: true,
  }),
)

// better-auth handles all /api/auth/* routes
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/api/health', healthRouter)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = Number(process.env['API_PORT'] ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})
