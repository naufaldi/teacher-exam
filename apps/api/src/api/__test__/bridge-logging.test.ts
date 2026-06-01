import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { logError } from "../../lib/server-log"
import { createBridgeServer } from "../bridge/create-bridge-server"

function getPort(): number {
  return 4000 + Math.floor(Math.random() * 1000)
}

async function waitForListen(server: { on: (event: string, cb: () => void) => void }): Promise<void> {
  return new Promise((resolve) => server.on("listening", () => resolve()))
}

describe("bridge structured logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("logs unhandled request errors as structured JSON with route context", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const bridge = createBridgeServer({
      port: getPort(),
      authHandler: (() =>
        Promise.resolve(new Response(null, { status: 204 }))) as never,
      httpApiHandler: () => Promise.reject(new Error("downstream blew up")),
      disposeHttpApi: () => Promise.resolve()
    })
    await waitForListen(bridge.server)

    const res = await fetch(`http://127.0.0.1:${bridge.server.address()?.port}/api/bank`)
    expect(res.status).toBe(500)
    await res.text()

    expect(errorSpy).toHaveBeenCalled()
    const line = errorSpy.mock.calls
      .map((c) => c[0])
      .find((v) => typeof v === "string" && v.includes("bridge.unhandled_request")) as
      | string
      | undefined
    expect(typeof line).toBe("string")
    const obj = JSON.parse(line as string) as Record<string, unknown>
    expect(obj).toMatchObject({
      level: "error",
      msg: "bridge.unhandled_request",
      service: "teacher-exam-api"
    })
    const extra = obj["extra"] as Record<string, unknown>
    expect(extra["cause"]).toBe("downstream blew up")
    expect(extra["method"]).toBe("GET")
    expect(typeof extra["url"]).toBe("string")

    await bridge.dispose()
  })

  it("logError is available for the boundary use case (smoke)", () => {
    expect(typeof logError).toBe("function")
  })
})
