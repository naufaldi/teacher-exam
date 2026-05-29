import type { Auth } from "better-auth"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { isAuthPath, isHttpApiPath } from "./migrated-routes"
import { nodeRequestToWebRequest, writeWebResponse } from "./node-http"

export type BridgeServer = {
  readonly server: ReturnType<typeof createServer>
  readonly dispose: () => Promise<void>
}

export function createBridgeServer(opts: {
  port: number
  authHandler: Auth["handler"]
  httpApiHandler: (request: Request) => Promise<Response>
  disposeHttpApi: () => Promise<void>
  onListen?: () => void
}): BridgeServer {
  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res, opts)
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }))
      }
      console.error("[bridge] unhandled request error", err)
    }
  })

  server.listen(opts.port, opts.onListen)

  return {
    server,
    dispose: opts.disposeHttpApi
  }
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    authHandler: Auth["handler"]
    httpApiHandler: (request: Request) => Promise<Response>
  }
): Promise<void> {
  const pathname = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname

  if (isAuthPath(pathname)) {
    const webReq = await nodeRequestToWebRequest(req)
    const authResponse = await opts.authHandler(webReq)
    await writeWebResponse(res, authResponse)
    return
  }

  if (isHttpApiPath(pathname)) {
    const webReq = await nodeRequestToWebRequest(req)
    const response = await opts.httpApiHandler(webReq)
    await writeWebResponse(res, response)
    return
  }

  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not found" }))
}
