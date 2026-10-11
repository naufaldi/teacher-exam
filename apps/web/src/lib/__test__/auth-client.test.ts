import { describe, expect, it } from "vitest"
import { authClientBaseUrl } from "../auth-client"

describe("authClientBaseUrl", () => {
  it("uses an absolute origin when the page origin is missing", () => {
    expect(authClientBaseUrl(undefined, undefined)).toBe("http://127.0.0.1/api/auth")
  })

  it("keeps the browser origin and an explicit API url", () => {
    expect(authClientBaseUrl("http://localhost:5173", undefined)).toBe("http://localhost:5173/api/auth")
    expect(authClientBaseUrl(undefined, "https://api.example.com/api")).toBe("https://api.example.com/api/auth")
  })
})
