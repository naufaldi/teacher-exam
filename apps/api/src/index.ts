import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect, ManagedRuntime } from "effect"
import { createBridgeServer } from "./api/bridge/create-bridge-server"
import { attachRateLimitHeaders } from "./api/lib/rate-limit-response"
import { setAuthEffectRunner } from "./api/services/auth-service"
import { databaseRuntime, disposeDatabase, startDatabase } from "./api/services/bootstrap-db"
import { withHttpSpan } from "./api/telemetry"
import { startBackgroundWorkers } from "./jobs/poll-workers"
import { initAuth } from "./lib/auth"
import { resolveApiPort } from "./lib/auth-origins"
import { assertDevAuthNotEnabledInProduction } from "./lib/dev-auth"
import { logError, logInfo } from "./lib/server-log"

process.on("uncaughtException", (err) => {
  logError("uncaught_exception", {
    message: err.message,
    stack: err.stack
  })
  process.exit(1)
})

assertDevAuthNotEnabledInProduction()

process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error) {
    logError("unhandled_rejection", {
      message: reason.message,
      stack: reason.stack
    })
    return
  }
  logError("unhandled_rejection", { reason: String(reason) })
})

async function main() {
  const db = await startDatabase()
  setAuthEffectRunner((effect) => databaseRuntime.runPromise(effect))
  initAuth(db)

  const { createWebHandlerLayer } = await import("./api/server.js")
  const port = resolveApiPort()
  const webLayer = createWebHandlerLayer()
  const runtime = ManagedRuntime.make(webLayer)
  const { dispose, handler } = HttpApiBuilder.toWebHandler(webLayer)

  const { getAuth } = await import("./lib/auth.js")

  const { server } = createBridgeServer({
    port,
    authHandler: getAuth().handler,
    httpApiHandler: async (request) => {
      const url = new URL(request.url)
      const response = await runtime.runPromise(
        withHttpSpan(
          request.method,
          url.pathname,
          Effect.promise(() => handler(request))
        )
      )
      return attachRateLimitHeaders(response)
    },
    disposeHttpApi: dispose,
    onListen: () => {
      logInfo("listening", { port, url: `http://localhost:${port}`, pid: process.pid })
      startBackgroundWorkers()
    }
  })

  const shutdown = () => {
    server.close(() => {
      void dispose().finally(() => {
        void runtime.dispose().finally(() => {
          void disposeDatabase().finally(() => process.exit(0))
        })
      })
    })
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  logError("startup_failed", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  })
  process.exit(1)
})
