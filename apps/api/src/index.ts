import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './lib/auth'
import { resolveAllowedCorsOrigins, resolveApiPort } from './lib/auth-origins'
import { logError, logInfo } from './lib/server-log'
import { requireAuth } from './middleware/auth'
import { errorHandler } from './middleware/error-handler'
import { aiGenerateLimiter, globalLimiter } from './middleware/rate-limit'
import { healthRouter } from './routes/health'
import { meRouter } from './routes/me'
import { examsRouter } from './routes/exams'
import { publicExamsRouter } from './routes/public-exams'
import { questionsRouter } from './routes/questions'
import { createAiRouter } from './routes/ai'

process.on('uncaughtException', (err) => {
  logError('uncaught_exception', {
    message: err.message,
    stack: err.stack,
  })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error) {
    logError('unhandled_rejection', {
      message: reason.message,
      stack: reason.stack,
    })
    return
  }
  logError('unhandled_rejection', { reason: String(reason) })
})

const app = new Hono()
const allowedCorsOrigins = new Set(resolveAllowedCorsOrigins())

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: (origin) => allowedCorsOrigins.has(origin) ? origin : null,
    credentials: true,
  }),
)

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/api/health', healthRouter)
app.route('/api/public/exams', publicExamsRouter)

app.use('/api/*', requireAuth)
app.use('/api/*', globalLimiter)
app.use('/api/ai/generate', aiGenerateLimiter)

app.route('/api/me', meRouter)
app.route('/api/exams', examsRouter)
app.route('/api/questions', questionsRouter)
app.route('/api/ai', createAiRouter())

app.onError(errorHandler)
app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = resolveApiPort()

const server = serve({ fetch: app.fetch, port }, () => {
  logInfo('listening', { port, url: `http://localhost:${port}`, pid: process.pid })
})

const shutdown = () => {
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
