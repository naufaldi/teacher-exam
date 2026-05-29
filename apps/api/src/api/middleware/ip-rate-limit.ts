import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import { Effect, Layer } from "effect"
import { ApiRateLimited } from "../errors/http"
import { createRateLimitChecker, type RateLimitChecker, type RateWindow } from "../lib/rate-limit-core"

export const PUBLIC_BANK_RATE_WINDOWS: ReadonlyArray<RateWindow> = [{ windowMs: 60_000, max: 60 }]

export class PublicBankIpRateLimit extends HttpApiMiddleware.Tag<PublicBankIpRateLimit>()(
  "PublicBankIpRateLimit",
  { failure: ApiRateLimited }
) {}

function resolveClientIp(headers: Record<string, string | undefined>): string {
  const forwarded = headers["x-forwarded-for"]
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = headers["x-real-ip"]
  if (realIp) return realIp
  return "unknown"
}

function makeIpRateLimitMiddleware(checker: RateLimitChecker): PublicBankIpRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const ip = resolveClientIp(request.headers)
    const result = checker.check(ip)
    if (!result.allowed) {
      return yield* Effect.fail(
        new ApiRateLimited({
          error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
          code: "RATE_LIMITED",
          retryAfterSec: result.retryAfterSec
        })
      )
    }
  }) as unknown as PublicBankIpRateLimit["Type"]
}

export const PublicBankIpRateLimitLive = Layer.succeed(
  PublicBankIpRateLimit,
  makeIpRateLimitMiddleware(createRateLimitChecker(PUBLIC_BANK_RATE_WINDOWS))
)

export function createTestPublicBankIpRateLimitLive(opts: {
  windows: ReadonlyArray<{ windowMs: number; max: number }>
  now?: () => number
}) {
  const now = opts.now
  const checker = createRateLimitChecker(
    opts.windows,
    now !== undefined ? { now } : {}
  )
  return Layer.succeed(PublicBankIpRateLimit, makeIpRateLimitMiddleware(checker))
}
