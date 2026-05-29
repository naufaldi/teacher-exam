import { describe, expect, it } from "vitest"
import { defaultBetterAuthBaseURL } from "../auth-base-url"

describe("defaultBetterAuthBaseURL", () => {
  it("uses API localhost when APP_URL is local web (Vite) and BETTER_AUTH_URL unset", () => {
    expect(defaultBetterAuthBaseURL({
      explicit: undefined,
      appUrl: "http://localhost:5173",
      apiPort: "3000"
    })).toBe("http://localhost:3000")
  })

  it("uses explicit BETTER_AUTH_URL when set", () => {
    expect(defaultBetterAuthBaseURL({
      explicit: "https://api.example.com",
      appUrl: "http://localhost:5173",
      apiPort: "3001"
    })).toBe("https://api.example.com")
  })

  it("uses APP_URL when it is a public host (prod-style) and BETTER_AUTH_URL unset", () => {
    expect(defaultBetterAuthBaseURL({
      explicit: undefined,
      appUrl: "https://app.example.com",
      apiPort: "3001"
    })).toBe("https://app.example.com")
  })

  it("uses localhost API with custom API_PORT", () => {
    expect(defaultBetterAuthBaseURL({
      explicit: undefined,
      appUrl: "http://127.0.0.1:5173",
      apiPort: "3002"
    })).toBe("http://localhost:3002")
  })
})
