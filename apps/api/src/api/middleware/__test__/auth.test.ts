import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@teacher-exam/db"
import { makeChain } from "../../../routes/__test__/helpers"
import { buildHttpApiTestApp } from "../../../routes/__test__/http-api-setup"

vi.mock("../../lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
        const userId = headers.get("x-test-user")
        return userId ? { user: { id: userId } } : null
      })
    }
  }
}))

describe("Authorization HttpApi middleware", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
  })

  it("returns 401 with JSON error when no session is present", async () => {
    const app = buildHttpApiTestApp({ authenticated: false })
    const res = await app.request("/api/me")
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: "Unauthorized" })
  })

  it("allows authenticated requests through to handlers", async () => {
    const app = buildHttpApiTestApp({ userId: "user_42" })
    const res = await app.request("/api/me")
    expect(res.status).toBe(404)
  })
})
