import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"

export async function nodeRequestToWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost"
  const url = `http://${host}${req.url ?? "/"}`
  const method = req.method ?? "GET"

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else {
      headers.set(key, value)
    }
  }

  const hasBody = method !== "GET" && method !== "HEAD"
  if (!hasBody) {
    return new Request(url, { method, headers })
  }

  return new Request(
    url,
    {
      method,
      headers,
      body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
      duplex: "half"
    } as RequestInit & { duplex: "half" }
  )
}

export async function writeWebResponse(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | Array<string>> = {}
  response.headers.forEach((value, key) => {
    const existing = headers[key]
    if (existing === undefined) {
      headers[key] = value
      return
    }
    headers[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
  })

  res.writeHead(response.status, headers)

  if (response.body) {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  }

  res.end()
}
