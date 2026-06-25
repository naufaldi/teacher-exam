import { describe, expect, it } from "vitest"
import { applyAuthCors, authPreflightResponse } from "../auth-cors"

const prodEnv = {
  APP_URL: "https://ujian-sekolah.faldi.xyz",
  BETTER_AUTH_URL: "https://api-ujian-sekolah.faldi.xyz"
}

describe("authPreflightResponse", () => {
  it("returns 204 with CORS headers for allowed production origin", () => {
    const request = new Request("https://api-ujian-sekolah.faldi.xyz/api/auth/sign-in/social", {
      method: "OPTIONS",
      headers: {
        Origin: "https://ujian-sekolah.faldi.xyz",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    })

    const response = authPreflightResponse(request, prodEnv)

    expect(response.status).toBe(204)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://ujian-sekolah.faldi.xyz")
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true")
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST")
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("content-type")
    expect(response.headers.get("Vary")).toBe("Origin")
  })

  it("does not allow disallowed origins", () => {
    const request = new Request("https://api-ujian-sekolah.faldi.xyz/api/auth/sign-in/social", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example.com",
        "Access-Control-Request-Method": "POST"
      }
    })

    const response = authPreflightResponse(request, prodEnv)

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})

describe("applyAuthCors", () => {
  it("adds CORS headers to auth responses for allowed origin", () => {
    const request = new Request("https://api-ujian-sekolah.faldi.xyz/api/auth/sign-in/social", {
      method: "POST",
      headers: { Origin: "https://ujian-sekolah.faldi.xyz" }
    })
    const upstream = new Response(JSON.stringify({ url: "https://accounts.google.com/" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

    const response = applyAuthCors(request, upstream, prodEnv)

    expect(response.status).toBe(200)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://ujian-sekolah.faldi.xyz")
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true")
    expect(response.headers.get("Content-Type")).toBe("application/json")
  })

  it("does not add allow-origin for disallowed origins", () => {
    const request = new Request("https://api-ujian-sekolah.faldi.xyz/api/auth/session", {
      method: "GET",
      headers: { Origin: "https://evil.example.com" }
    })
    const upstream = new Response(null, { status: 200 })

    const response = applyAuthCors(request, upstream, prodEnv)

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})
