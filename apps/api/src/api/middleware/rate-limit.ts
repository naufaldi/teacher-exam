import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import { Effect, Layer } from "effect"
import { auth } from "../../lib/auth"
import { ApiRateLimited } from "../errors/http"
import {
  AI_GENERATE_RATE_WINDOWS,
  createRateLimitChecker,
  GLOBAL_RATE_WINDOWS,
  type RateLimitChecker
} from "../lib/rate-limit-core"

export class GlobalRateLimit extends HttpApiMiddleware.Tag<GlobalRateLimit>()("GlobalRateLimit", {
  failure: ApiRateLimited
}) {}

export class AiGenerateRateLimit extends HttpApiMiddleware.Tag<AiGenerateRateLimit>()(
  "AiGenerateRateLimit",
  { failure: ApiRateLimited }
) {}

function makeRateLimitMiddleware(checker: RateLimitChecker): GlobalRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const session = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: request.headers }),
      catch: () => null
    })
    if (!session?.user) {
      return
    }
    const result = checker.check(session.user.id)
    if (!result.allowed) {
      return yield* Effect.fail(
        new ApiRateLimited({
          error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
          code: "RATE_LIMITED",
          retryAfterSec: result.retryAfterSec
        })
      )
    }
  }) as unknown as GlobalRateLimit["Type"]
}

export const GlobalRateLimitLive = Layer.succeed(
  GlobalRateLimit,
  makeRateLimitMiddleware(createRateLimitChecker(GLOBAL_RATE_WINDOWS))
)

export const AiGenerateRateLimitLive = Layer.succeed(
  AiGenerateRateLimit,
  makeRateLimitMiddleware(createRateLimitChecker(AI_GENERATE_RATE_WINDOWS)) as unknown as AiGenerateRateLimit["Type"]
)

export function createTestGlobalRateLimitLive(opts: {
  windows: ReadonlyArray<{ windowMs: number; max: number }>
  now?: () => number
}) {
  const now = opts.now
  const checker = createRateLimitChecker(
    opts.windows,
    now !== undefined ? { now } : {}
  )
  return Layer.succeed(GlobalRateLimit, makeRateLimitMiddleware(checker))
}
