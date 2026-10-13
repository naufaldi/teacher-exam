import type { AddressInfo } from "node:net"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type BridgeServer, createBridgeServer } from "../bridge/create-bridge-server"

vi.mock("../bridge/pdf-upload-route", () => ({
  handlePdfUploadGetList: vi.fn(async () => Response.json({ error: "Unauthorized" }, { status: 401 })),
  handlePdfUploadPost: vi.fn(async () => Response.json({ id: "pdf-1", status: "processing" }, { status: 201 })),
  handlePdfUploadGetDetail: vi.fn(async () => Response.json({ error: "Unauthorized" }, { status: 401 })),
  handlePdfUploadDelete: vi.fn(async () => new Response(null, { status: 204 }))
}))

const servers: Array<BridgeServer> = []

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://ujian-sekolah.faldi.xyz")
  vi.stubEnv("BETTER_AUTH_URL", "https://api-ujian-sekolah.faldi.xyz")
})

async function startServer(): Promise<string> {
  const bridge = createBridgeServer({
    port: 0,
    authHandler: async () => new Response(null, { status: 404 }),
    httpApiHandler: async () => new Response(null, { status: 404 }),
    disposeHttpApi: async () => undefined
  })
  servers.push(bridge)

  if (!bridge.server.listening) {
    await new Promise<void>((resolve) => {
      bridge.server.once("listening", resolve)
    })
  }

  const address = bridge.server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(async (bridge) => {
      await new Promise<void>((resolve, reject) => {
        bridge.server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      })
      await bridge.dispose()
    })
  )
  vi.unstubAllEnvs()
})

describe("PDF upload bridge CORS", () => {
  it("adds credentialed CORS headers to PDF error responses for the production web origin", async () => {
    const baseUrl = await startServer()

    const response = await fetch(`${baseUrl}/api/pdf-uploads`, {
      headers: { Origin: "https://ujian-sekolah.faldi.xyz" }
    })

    expect(response.status).toBe(401)
    expect(response.headers.get("Access-Control-Allow-Origin"))
      .toBe("https://ujian-sekolah.faldi.xyz")
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true")
    expect(response.headers.get("Vary")).toContain("Origin")
  })

  it("adds credentialed CORS headers to successful PDF upload responses", async () => {
    const baseUrl = await startServer()

    const response = await fetch(`${baseUrl}/api/pdf-uploads`, {
      method: "POST",
      headers: {
        Origin: "https://ujian-sekolah.faldi.xyz",
        "Content-Type": "application/pdf"
      },
      body: "%PDF-1.4"
    })

    expect(response.status).toBe(201)
    expect(response.headers.get("Access-Control-Allow-Origin"))
      .toBe("https://ujian-sekolah.faldi.xyz")
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true")
  })

  it("does not add allow-origin for an untrusted origin", async () => {
    const baseUrl = await startServer()

    const response = await fetch(`${baseUrl}/api/pdf-uploads`, {
      headers: { Origin: "https://evil.example.com" }
    })

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})
