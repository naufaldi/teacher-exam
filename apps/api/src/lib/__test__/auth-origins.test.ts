import { describe, expect, test } from "vitest"
import { resolveAllowedCorsOrigins, resolveApiPort, resolveAuthBaseURL, resolveTrustedOrigins } from "../auth-origins"

describe("resolveTrustedOrigins", () => {
  test("trusts the Vite dev origin when APP_URL is localhost", () => {
    expect(resolveTrustedOrigins({ APP_URL: "http://localhost:5173" })).toContain("http://localhost:5173")
  })

  test("includes comma-separated extra trusted origins", () => {
    expect(resolveTrustedOrigins({
      APP_URL: "https://app.example.com",
      AUTH_TRUSTED_ORIGINS: "http://localhost:5173, https://preview.example.com "
    })).toEqual([
      "https://app.example.com",
      "http://localhost:5173",
      "https://preview.example.com"
    ])
  })
})

describe("resolveAllowedCorsOrigins", () => {
  test("allows the same browser origins trusted by better-auth", () => {
    expect(resolveAllowedCorsOrigins({
      APP_URL: "http://localhost:5173",
      WEB_PORT: "5174",
      AUTH_TRUSTED_ORIGINS: "https://preview.example.com"
    })).toEqual([
      "http://localhost:5173",
      "http://localhost:5174",
      "https://preview.example.com"
    ])
  })
})

describe("resolveAuthBaseURL", () => {
  test("uses the shared default API port when API_PORT is unset", () => {
    expect(resolveApiPort({})).toBe(3000)
    expect(resolveAuthBaseURL({
      APP_URL: "http://localhost:5173"
    })).toBe("http://localhost:3000")
  })

  test("uses the API port as local Better Auth base URL when BETTER_AUTH_URL is unset", () => {
    expect(resolveAuthBaseURL({
      APP_URL: "http://localhost:5173",
      API_PORT: "3000",
      WEB_PORT: "5173"
    })).toBe("http://localhost:3000")
  })

  test("rejects an API port that collides with the web port", () => {
    expect(() =>
      resolveApiPort({
        API_PORT: "3000",
        WEB_PORT: "3000"
      })
    ).toThrow("API_PORT must not equal WEB_PORT")
  })

  test("prefers explicit BETTER_AUTH_URL", () => {
    expect(resolveAuthBaseURL({
      APP_URL: "https://web.example.com",
      BETTER_AUTH_URL: "https://api.example.com"
    })).toBe("https://api.example.com")
  })
})
