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

const MAX_CLIENT_IP_LENGTH = 45

export const PUBLIC_BANK_RATE_WINDOWS: ReadonlyArray<RateWindow> = [{ windowMs: 60_000, max: 60 }]

export type PublicBankPeer = {
  remoteAddress?: string | undefined
  trustedProxies?: ReadonlyArray<string> | undefined
}

function stripMappedIpv4(value: string): string {
  return value.toLowerCase().startsWith("::ffff:") ? value.slice("::ffff:".length) : value
}

function isIpv4(value: string): boolean {
  const parts = value.split(".")
  if (parts.length !== 4) return false
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false
    if (part.length > 1 && part.startsWith("0")) return false
    const octet = Number(part)
    if (octet > 255) return false
  }
  return true
}

function isIpv6(value: string): boolean {
  if (!value.includes(":")) return false
  if (!/^[0-9a-f:]+$/i.test(value)) return false
  const halves = value.split("::")
  if (halves.length > 2) return false
  const groups = halves.join(":").split(":").filter((group) => group.length > 0)
  if (halves.length === 1 && groups.length !== 8) return false
  if (halves.length === 2 && groups.length > 7) return false
  return groups.every((group) => /^[0-9a-f]{1,4}$/i.test(group))
}

function isBoundedClientIp(value: string): boolean {
  return value.length > 0 && value.length <= MAX_CLIENT_IP_LENGTH && (isIpv4(value) || isIpv6(value))
}

function defaultTrustedProxies(): ReadonlyArray<string> {
  const raw = process.env["TRUSTED_PROXY_IPS"]
  if (raw === undefined || raw.trim().length === 0) return ["127.0.0.1", "::1"]
  return raw.split(",").map((part) => part.trim()).filter((part) => part.length > 0)
}

export function publicBankClientKey(
  connectingIp: string | undefined,
  peer: PublicBankPeer = {}
): string {
  const trusted = peer.trustedProxies ?? defaultTrustedProxies()
  const remote = stripMappedIpv4((peer.remoteAddress ?? "").trim())
  const header = stripMappedIpv4((connectingIp?.split(",")[0] ?? "").trim())
  const peerIsTrusted = remote.length > 0 && trusted.includes(remote)
  if (peerIsTrusted && isBoundedClientIp(header)) return `bank:${header}`
  if (isBoundedClientIp(remote)) return `bank:${remote}`
  return "bank:anonymous"
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

function peerFromRequest(request: HttpServerRequest.HttpServerRequest): PublicBankPeer {
  return {
    remoteAddress: Option.match(request.remoteAddress, {
      onNone: () => undefined,
      onSome: (value) => value
    })
  }
}

function makeIpRateLimitMiddleware(checker: RateLimitChecker): PublicBankIpRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const result = checker.check(
      publicBankClientKey(readConnectingIp(request.headers), peerFromRequest(request))
    )
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
      publicBankClientKey(readConnectingIp(request.headers), peerFromRequest(request)),
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
