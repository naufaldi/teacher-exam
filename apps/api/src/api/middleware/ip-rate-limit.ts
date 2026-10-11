import * as Headers from "@effect/platform/Headers"
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import { Effect, Layer, Option } from "effect"
import { ApiRateLimited } from "../errors/http"
import {
  createRateLimitChecker,
  persistedRateLimitsEnabled,
  type RateLimitChecker,
  type RateWindow,
  takePersistedRateLimitHit
} from "../lib/rate-limit-core"

export const PUBLIC_BANK_RATE_WINDOWS: ReadonlyArray<RateWindow> = [{ windowMs: 60_000, max: 60 }]

export function publicBankClientKey(connectingIp: string | undefined): string {
  const first = connectingIp?.split(",")[0]?.trim() ?? ""
  return first.length > 0 ? `bank:${first}` : "bank:missing"
}

export class PublicBankIpRateLimit extends HttpApiMiddleware.Tag<PublicBankIpRateLimit>()(
  "PublicBankIpRateLimit",
  { failure: ApiRateLimited }
) {}

function readConnectingIp(headers: Headers.Headers): string | undefined {
  return Option.match(Headers.get(headers, "cf-connecting-ip"), {
    onNone: () => undefined,
    onSome: (value) => value
  })
}

function makeIpRateLimitMiddleware(checker: RateLimitChecker): PublicBankIpRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const result = checker.check(publicBankClientKey(readConnectingIp(request.headers)))
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

function makePersistedIpRateLimitMiddleware(): PublicBankIpRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const result = yield* takePersistedRateLimitHit(
      publicBankClientKey(readConnectingIp(request.headers)),
      PUBLIC_BANK_RATE_WINDOWS,
      Date.now()
    ).pipe(Effect.orDie)
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
  persistedRateLimitsEnabled()
    ? makePersistedIpRateLimitMiddleware()
    : makeIpRateLimitMiddleware(createRateLimitChecker(PUBLIC_BANK_RATE_WINDOWS))
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
