import * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServer from "@effect/platform/HttpServer"
import { Layer } from "effect"
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { createServer } from "node:http"
import { afterEach, describe, expect, it, vi } from "vitest"
import { HealthGroup } from "../../groups/health"
import { stampSocketPeer } from "../../middleware/ip-rate-limit"
import { HealthLive } from "../health"

const LOOPBACK_PROBE = "http://127.0.0.1:3001/api/health/ai-live"

function smokeCheckSource(): string {
  const script = readFileSync(new URL("../../../../../../scripts/ai-live-smoke.sh", import.meta.url), "utf8")
  const match = /node -e '([^']+)'/.exec(script)
  const source = match?.[1]
  if (source === undefined) {
    throw new Error("ai-live-smoke.sh has no node check")
  }
  return source
}

function serveBody(status: number, body: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((_request, response) => {
    response.writeHead(status, { "content-type": "application/json" })
    response.end(body)
  })
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (address === null || typeof address === "string") {
        reject(new Error("smoke stub did not bind a port"))
        return
      }
      resolve({
        url: `http://127.0.0.1:${address.port}/api/health/ai-live`,
        close: () =>
          new Promise((done, fail) => {
            server.close((error) => {
              if (error) fail(error)
              else done()
            })
          })
      })
    })
  })
}

function runDeploySmokeCheck(url: string): Promise<{ status: number | null; stderr: string }> {
  const source = smokeCheckSource().replaceAll(LOOPBACK_PROBE, url)
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", source])
    const chunks: Array<Buffer> = []
    child.stderr.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })
    child.on("error", (error) => {
      reject(error)
    })
    child.on("close", (status) => {
      resolve({ status, stderr: Buffer.concat(chunks).toString("utf8") })
    })
  })
}

const TestApi = HttpApi.make("TestApi").add(HealthGroup).prefix("/api")

const fetchImpl = vi.fn(async () =>
  new Response(JSON.stringify({ model: "gpt-6-luna" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  })
)

function stampedRequest(url: string, remoteAddress: string | undefined, spoof?: string): Request {
  const headers = new Headers()
  if (spoof !== undefined) headers.set("x-teacher-exam-peer", spoof)
  stampSocketPeer(headers, remoteAddress)
  return new Request(url, { headers })
}

async function handle(request: Request): Promise<Response> {
  const ApiLive = HttpApiBuilder.api(TestApi).pipe(Layer.provide(HealthLive))
  const layer = Layer.mergeAll(ApiLive, HttpServer.layerContext)
  const { dispose, handler } = HttpApiBuilder.toWebHandler(layer)
  try {
    return await handler(request)
  } finally {
    await dispose()
  }
}

describe("AI health routes", () => {
  afterEach(() => {
    fetchImpl.mockClear()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("reports OpenAI config presence on the public route and does not call the provider", async () => {
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("AI_MODEL", "gpt-6-luna")

    const res = await handle(new Request("http://localhost/api/health/ai"))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: "ok",
      provider: "openai",
      model: "gpt-6-luna",
      keyConfigured: true
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("reports a missing OpenAI key without calling the provider", async () => {
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-present")

    const res = await handle(new Request("http://localhost/api/health/ai"))

    expect(res.status).toBe(200)
    const body = await res.json() as { keyConfigured: boolean; provider: string }
    expect(body.provider).toBe("openai")
    expect(body.keyConfigured).toBe(false)
    expect(JSON.stringify(body)).not.toContain("sk-ant-present")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("refuses a public socket on the live route, including a spoofed loopback header, and does not call the provider", async () => {
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")

    const res = await handle(
      stampedRequest("http://localhost/api/health/ai-live", "10.0.0.5", "127.0.0.1")
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({
      error: "Forbidden",
      message: "AI live health is only available from inside the API container."
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("refuses the live route when the socket peer is missing", async () => {
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")

    const res = await handle(
      stampedRequest("http://localhost/api/health/ai-live", undefined, "127.0.0.1")
    )

    expect(res.status).toBe(403)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("probes gpt-6-luna from a loopback socket", async () => {
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("AI_MODEL", "gpt-6-luna")

    const res = await handle(stampedRequest("http://localhost/api/health/ai-live", "127.0.0.1"))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      status: "ok",
      provider: "openai",
      model: "gpt-6-luna"
    })
    expect(JSON.stringify(body)).not.toContain("test-openai-key")
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const call = fetchImpl.mock.calls[0]
    expect(call).toBeDefined()
    expect(String(call?.[0])).toContain("/responses")
    const init = call?.[1] as RequestInit
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "gpt-6-luna" })
  })

  it("treats an IPv4-mapped loopback socket as internal", async () => {
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("AI_MODEL", "gpt-6-luna")

    const res = await handle(stampedRequest("http://localhost/api/health/ai-live", "::ffff:127.0.0.1"))

    expect(res.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("fails the deploy smoke step when the provider rejects the API key", async () => {
    fetchImpl.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "Incorrect API key provided",
            type: "invalid_request_error",
            code: "invalid_api_key"
          }
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      )
    )
    vi.stubGlobal("fetch", fetchImpl)
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "bad-key")
    vi.stubEnv("AI_MODEL", "gpt-6-luna")

    const res = await handle(stampedRequest("http://localhost/api/health/ai-live", "127.0.0.1"))
    const body = await res.text()

    expect(res.status).toBe(502)
    expect(JSON.parse(body)).toEqual({
      _tag: "ApiAiGenerationError",
      error: "AI generation failed",
      message: "Penyedia AI menolak generate (HTTP 401)."
    })
    expect(body).not.toContain("bad-key")

    const call = fetchImpl.mock.calls[0]
    const init = call?.[1] as RequestInit
    expect(String(call?.[0])).toBe("https://api.openai.com/v1/responses")
    expect(JSON.parse(String(init.body))).toEqual({
      model: "gpt-6-luna",
      input: "ping",
      max_output_tokens: 16
    })

    const rejected = await serveBody(res.status, body)
    const accepted = await serveBody(
      200,
      JSON.stringify({ status: "ok", provider: "openai", model: "gpt-6-luna" })
    )
    try {
      const failed = await runDeploySmokeCheck(rejected.url)
      expect(failed.status).toBe(1)
      expect(failed.stderr).toContain("502")
      expect(failed.stderr).not.toContain("bad-key")

      const passed = await runDeploySmokeCheck(accepted.url)
      expect(passed.status).toBe(0)
    } finally {
      await rejected.close()
      await accepted.close()
    }
  })
})
