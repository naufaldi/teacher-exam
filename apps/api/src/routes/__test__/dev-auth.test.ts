import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TestAuthServiceLayer } from "../../api/services/auth-service"
import { buildHttpApiTestApp } from "./http-api-setup"

const mockSignInEmail = vi.fn<(...args: Array<unknown>) => Promise<Response>>()

function buildApp() {
  return buildHttpApiTestApp({
    authenticated: false,
    authLayer: TestAuthServiceLayer({
      signInEmail: (input) =>
        Effect.tryPromise({
          try: () => mockSignInEmail(input),
          catch: (cause) => cause as never
        })
    })
  })
}

describe("POST /api/dev/login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns 403 when dev auth is disabled", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "")
    vi.stubEnv("NODE_ENV", "development")

    const app = buildApp()
    const res = await app.request("/api/dev/login", {
      method: "POST",
      headers: { Host: "localhost:3000" }
    })

    expect(res.status).toBe(403)
    expect(mockSignInEmail).not.toHaveBeenCalled()
  })

  it("returns 403 when host is not localhost", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "true")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DEV_AUTH_EMAIL", "dev@guru.local")
    vi.stubEnv("DEV_AUTH_PASSWORD", "secret")

    const app = buildApp()
    const res = await app.request("/api/dev/login", {
      method: "POST",
      headers: { Host: "ujian-sekolah.faldi.xyz" }
    })

    expect(res.status).toBe(403)
    expect(mockSignInEmail).not.toHaveBeenCalled()
  })

  it("returns 200 and forwards Set-Cookie when dev auth is enabled", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "true")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DEV_AUTH_EMAIL", "dev@guru.local")
    vi.stubEnv("DEV_AUTH_PASSWORD", "secret")

    const mockResponse = new Response(JSON.stringify({ user: { id: "u1" } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "better-auth.session_token=abc; Path=/; HttpOnly"
      }
    })
    mockSignInEmail.mockResolvedValueOnce(mockResponse)

    const app = buildApp()
    const res = await app.request("/api/dev/login", {
      method: "POST",
      headers: { Host: "localhost:3000" }
    })

    expect(res.status).toBe(200)
    expect(mockSignInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "dev@guru.local",
        password: "secret"
      })
    )
    const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []
    const cookieHeader = res.headers.get("set-cookie")
    expect(
      setCookies.some((c) => c.includes("better-auth.session_token")) ||
        (cookieHeader?.includes("better-auth.session_token") ?? false)
    ).toBe(true)
  })

  it("returns 401 when sign-in fails", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "true")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DEV_AUTH_EMAIL", "dev@guru.local")
    vi.stubEnv("DEV_AUTH_PASSWORD", "secret")

    mockSignInEmail.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 })
    )

    const app = buildApp()
    const res = await app.request("/api/dev/login", {
      method: "POST",
      headers: { Host: "localhost:3000" }
    })

    expect(res.status).toBe(401)
  })
})
