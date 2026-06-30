import type { Auth } from "better-auth"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { logError } from "../../lib/server-log"
import { applyAuthCors, authPreflightResponse } from "../auth-cors"
import { isAuthPath, isHttpApiPath } from "./migrated-routes"
import { nodeRequestToWebRequest, writeWebResponse } from "./node-http"
import {
  handlePdfUploadDelete,
  handlePdfUploadGetDetail,
  handlePdfUploadGetList,
  handlePdfUploadPost
} from "./pdf-upload-route"

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
      logError("bridge.unhandled_request", {
        method: req.method ?? "UNKNOWN",
        url: req.url ?? "UNKNOWN",
        cause: err instanceof Error ? err.message : String(err)
      })
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

    if (webReq.method === "OPTIONS") {
      await writeWebResponse(res, authPreflightResponse(webReq))
      return
    }

    const authResponse = await opts.authHandler(webReq)
    await writeWebResponse(res, applyAuthCors(webReq, authResponse))
    return
  }

  if (pathname === "/api/pdf-uploads" && req.method === "GET") {
    const webReq = await nodeRequestToWebRequest(req)
    const response = await handlePdfUploadGetList(webReq)
    await writeWebResponse(res, response)
    return
  }

  if (pathname === "/api/pdf-uploads" && req.method === "POST") {
    const webReq = await nodeRequestToWebRequest(req)
    const response = await handlePdfUploadPost(webReq)
    await writeWebResponse(res, response)
    return
  }

  const pdfUploadDetailMatch = /^\/api\/pdf-uploads\/([^/]+)$/.exec(pathname)
  if (pdfUploadDetailMatch) {
    const webReq = await nodeRequestToWebRequest(req)
    const pdfUploadId = pdfUploadDetailMatch[1] ?? ""
    if (req.method === "GET") {
      const response = await handlePdfUploadGetDetail(webReq, pdfUploadId)
      await writeWebResponse(res, response)
      return
    }
    if (req.method === "DELETE") {
      const response = await handlePdfUploadDelete(webReq, pdfUploadId)
      await writeWebResponse(res, response)
      return
    }
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
