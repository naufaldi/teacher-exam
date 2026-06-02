import { Match } from "effect"
import {
  ApiClientError,
  type ApiClientFailure,
  DecodeClientError,
  NetworkClientError,
  RateLimitedClientError,
  UnauthorizedClientError
} from "./api-errors.js"
import { devLog } from "./dev-log.js"

export interface ClientLogContext {
  scope: string
  path?: string | undefined
  method?: string | undefined
  userId?: string | undefined
  extra?: Record<string, unknown> | undefined
}

/**
 * Build a structured payload from a typed client error using exhaustive
 * Match over the ApiClientFailure union. Returns a plain object so it is
 * safe to log, transport, or send to a future error-reporting sink.
 */
export function clientErrorPayload(err: ApiClientFailure): Record<string, unknown> {
  return Match.value(err).pipe(
    Match.tag("UnauthorizedClientError", (e) => ({
      tag: e._tag,
      message: e.message ?? null
    })),
    Match.tag("RateLimitedClientError", (e) => ({
      tag: e._tag,
      retryAfterSec: e.retryAfterSec,
      message: e.message ?? null
    })),
    Match.tag("ApiClientError", (e) => ({
      tag: e._tag,
      code: e.code,
      status: e.status,
      message: e.message,
      details: e.details
    })),
    Match.tag("NetworkClientError", (e) => ({ tag: e._tag, message: e.message })),
    Match.tag("DecodeClientError", (e) => ({ tag: e._tag, message: e.message })),
    Match.exhaustive
  )
}

/**
 * Record a typed client error. Currently emits to devLog (no-op in
 * production). When an error-reporting sink is added, the implementation
 * will branch on import.meta.env.PROD here without changing callers.
 */
export function logClientError(err: ApiClientFailure, ctx: ClientLogContext): void {
  const payload = clientErrorPayload(err)
  devLog(ctx.scope, { ...ctx.extra, ...payload, path: ctx.path, method: ctx.method })
}

// Convenience overloads preserve call-site ergonomics for the common patterns
// (typed failure + scope only, or scope + request context).
export function logFromTag<E extends ApiClientFailure>(
  err: E,
  scope: string,
  request?: { path?: string; method?: string }
): void {
  logClientError(err, { scope, path: request?.path, method: request?.method })
}

// Re-export error classes for callers that want a single import.
export {
  ApiClientError,
  type ApiClientFailure,
  DecodeClientError,
  NetworkClientError,
  RateLimitedClientError,
  UnauthorizedClientError
}
