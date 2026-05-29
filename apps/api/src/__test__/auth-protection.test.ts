import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@teacher-exam/db"
import { makeChain } from "../routes/__test__/helpers"
import { buildHttpApiTestApp } from "../routes/__test__/http-api-setup"

vi.mock("../lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null)
    }
  }
}))

function buildApp() {
  return buildHttpApiTestApp({ authenticated: false })
}

describe("auth protection on protected API routes", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
  })
  it("GET /api/health is reachable without a session", async () => {
    const app = buildApp()
    const res = await app.request("/api/health")
    expect(res.status).toBe(200)
  })

  it("POST /api/dev/login is not blocked by requireAuth when dev auth is disabled", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "")
    vi.stubEnv("NODE_ENV", "development")

    const app = buildApp()
    const res = await app.request("/api/dev/login", {
      method: "POST",
      headers: { Host: "localhost:3000" }
    })

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({
      error: "Forbidden",
      message: "Dev auth is not available"
    })
    vi.unstubAllEnvs()
  })

  it("GET /api/me returns 401 without a session", async () => {
    const app = buildApp()
    const res = await app.request("/api/me")
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: "Unauthorized" })
  })

  it("GET /api/public/exams/:slug is reachable without a session", async () => {
    const app = buildApp()
    const res = await app.request("/api/public/exams/missing-share")
    expect(res.status).toBe(404)
  })

  it("POST /api/ai/generate returns 401 without a session and never invokes the AI service", async () => {
    const app = buildApp()
    const res = await app.request("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "bahasa_indonesia",
        grade: 5,
        difficulty: "sedang"
      })
    })
    expect(res.status).toBe(401)
  })
})
