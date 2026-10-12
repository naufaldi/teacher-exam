import { betterAuth } from "better-auth"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)

function installedBetterAuthVersion(): string {
  const entry = require.resolve("better-auth")
  const packageJson = join(dirname(entry), "..", "package.json")
  const parsed = JSON.parse(readFileSync(packageJson, "utf8")) as { version: string }
  return parsed.version
}

describe("better-auth advisory floor", () => {
  it("resolves 1.7.7, which closes the OAuth state replay and proxy takeover advisories", () => {
    expect(installedBetterAuthVersion()).toBe("1.7.7")
  })
})

describe("Google login smoke", () => {
  it("returns a Google authorize URL for a social sign-in", async () => {
    const auth = betterAuth({
      secret: "smoke-secret-smoke-secret-smoke-secret",
      baseURL: "http://localhost:3000",
      socialProviders: {
        google: {
          clientId: "smoke-client",
          clientSecret: "smoke-client-secret"
        }
      }
    })

    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000"
        },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "http://localhost:3000/dashboard"
        })
      })
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { url?: string }
    expect(body.url?.startsWith("https://accounts.google.com/o/oauth2/v2/auth?")).toBe(true)
    expect(body.url).toContain("client_id=smoke-client")
    expect(body.url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgoogle")
  })
})
