import { resolveAllowedCorsOrigins } from "../lib/auth-origins"

const ALLOWED_METHODS = "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS"

type CorsEnv = Parameters<typeof resolveAllowedCorsOrigins>[0]

function resolveAllowedOrigin(request: Request, env: CorsEnv = process.env): string | null {
  const origin = request.headers.get("Origin")
  if (!origin) return null

  const allowed = new Set(resolveAllowedCorsOrigins(env))
  return allowed.has(origin) ? origin : null
}

function corsHeaders(request: Request, env: CorsEnv = process.env): Headers {
  const headers = new Headers()
  const origin = resolveAllowedOrigin(request, env)

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Allow-Credentials", "true")
    headers.set("Vary", "Origin")
  }

  return headers
}

export function corsPreflightResponse(request: Request, env: CorsEnv = process.env): Response {
  const headers = corsHeaders(request, env)
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS)

  const requestedHeaders = request.headers.get("Access-Control-Request-Headers")
  if (requestedHeaders) {
    headers.set("Access-Control-Allow-Headers", requestedHeaders)
  }

  return new Response(null, { status: 204, headers })
}

export function applyCors(
  request: Request,
  response: Response,
  env: CorsEnv = process.env
): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of corsHeaders(request, env).entries()) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export const authPreflightResponse = corsPreflightResponse
export const applyAuthCors = applyCors
