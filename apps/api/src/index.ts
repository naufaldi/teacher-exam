import { HttpApiBuilder } from '@effect/platform'
import { auth } from './lib/auth'
import { resolveApiPort } from './lib/auth-origins'
import { assertDevAuthNotEnabledInProduction } from './lib/dev-auth'
import { logError, logInfo } from './lib/server-log'
import { attachRateLimitHeaders } from './api/lib/rate-limit-response'
import { createBridgeServer } from './api/bridge/create-bridge-server'
import { createWebHandlerLayer } from './api/server'

process.on('uncaughtException', (err) => {
  logError('uncaught_exception', {
    message: err.message,
    stack: err.stack,
  })
  process.exit(1)
})

assertDevAuthNotEnabledInProduction()

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

const port = resolveApiPort()
const { handler, dispose } = HttpApiBuilder.toWebHandler(createWebHandlerLayer())

const { server } = createBridgeServer({
  port,
  authHandler: auth.handler,
  httpApiHandler: async (request) => attachRateLimitHeaders(await handler(request)),
  disposeHttpApi: dispose,
  onListen: () => {
    logInfo('listening', { port, url: `http://localhost:${port}`, pid: process.pid })
  },
})

const shutdown = () => {
  server.close(() => {
    void dispose().finally(() => process.exit(0))
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
