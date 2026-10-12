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
export const TEACHER_EXAM_PEER_HEADER = "x-teacher-exam-peer"

export const PUBLIC_BANK_RATE_WINDOWS: ReadonlyArray<RateWindow> = [{ windowMs: 60_000, max: 60 }]

export const SESSION_IP_CEILING_WINDOWS: ReadonlyArray<RateWindow> = [{ windowMs: 60_000, max: 600 }]

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

export function stampSocketPeer(
  headers: { delete: (name: string) => void; set: (name: string, value: string) => void },
  remoteAddress: string | undefined
): void {
  headers.delete(TEACHER_EXAM_PEER_HEADER)
  const remote = stripMappedIpv4((remoteAddress ?? "").trim())
  if (isBoundedClientIp(remote)) headers.set(TEACHER_EXAM_PEER_HEADER, remote)
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

function stringField(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return ""
  const value = Reflect.get(body, key)
  return typeof value === "string" ? value.trim() : ""
}

export function studentLockoutKey(sessionCode: string, body: unknown): string {
  const token = stringField(body, "token")
  if (token.length > 0) return `student:${sessionCode}:token:${token}`
  const name = stringField(body, "studentName").toLowerCase()
  if (name.length > 0) {
    return `student:${sessionCode}:name:${name}|${stringField(body, "identifier").toLowerCase()}`
  }
  return `student:${sessionCode}:unidentified`
}

type SessionRateSubject = {
  readonly code: string
  readonly action: "lobby" | "write"
}

function sessionRateSubject(url: string): SessionRateSubject | undefined {
  const path = url.split("?")[0] ?? url
  const match = /^\/api\/sessions\/([^/]+)(?:\/(start|submit))?$/.exec(path)
  const rawCode = match?.[1]
  if (rawCode === undefined || rawCode.length === 0) return undefined
  const code = decodeURIComponent(rawCode)
  const action = match?.[2]
  if (action === "start" || action === "submit") return { code, action: "write" }
  return { code, action: "lobby" }
}

function sessionIpCeilingKey(request: HttpServerRequest.HttpServerRequest): string {
  return `session-ip:${publicBankClientKey(readConnectingIp(request.headers), peerFromRequest(request))}`
}

function rateLimited(retryAfterSec: number): ApiRateLimited {
  return new ApiRateLimited({
    error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
    code: "RATE_LIMITED",
    retryAfterSec
  })
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

function readStampedPeer(headers: Headers.Headers): string | undefined {
  return Option.match(Headers.get(headers, TEACHER_EXAM_PEER_HEADER), {
    onNone: () => undefined,
    onSome: (value) => value
  })
}

function peerFromRequest(request: HttpServerRequest.HttpServerRequest): PublicBankPeer {
  const socket = Option.match(request.remoteAddress, {
    onNone: () => undefined,
    onSome: (value) => value
  })
  return {
    remoteAddress: socket ?? readStampedPeer(request.headers)
  }
}

function makeIpRateLimitMiddleware(
  checker: RateLimitChecker,
  ipCeiling: RateLimitChecker
): PublicBankIpRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const subject = sessionRateSubject(request.url)
    if (subject === undefined) {
      const result = checker.check(
        publicBankClientKey(readConnectingIp(request.headers), peerFromRequest(request))
      )
      if (!result.allowed) return yield* Effect.fail(rateLimited(result.retryAfterSec))
      return
    }
    const ipResult = ipCeiling.check(sessionIpCeilingKey(request))
    if (!ipResult.allowed) return yield* Effect.fail(rateLimited(ipResult.retryAfterSec))
    if (subject.action === "lobby") return
    const body = yield* request.json.pipe(Effect.catchAll(() => Effect.succeed({})))
    const result = checker.check(studentLockoutKey(subject.code, body))
    if (!result.allowed) return yield* Effect.fail(rateLimited(result.retryAfterSec))
  }) as unknown as PublicBankIpRateLimit["Type"]
}

function makePersistedIpRateLimitMiddleware(): PublicBankIpRateLimit["Type"] {
  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const subject = sessionRateSubject(request.url)
    const nowMs = Date.now()
    if (subject === undefined) {
      const result = yield* takePersistedRateLimitHit(
        publicBankClientKey(readConnectingIp(request.headers), peerFromRequest(request)),
        PUBLIC_BANK_RATE_WINDOWS,
        nowMs
      ).pipe(Effect.orDie)
      if (!result.allowed) return yield* Effect.fail(rateLimited(result.retryAfterSec))
      return
    }
    const ipResult = yield* takePersistedRateLimitHit(
      sessionIpCeilingKey(request),
      SESSION_IP_CEILING_WINDOWS,
      nowMs
    ).pipe(Effect.orDie)
    if (!ipResult.allowed) return yield* Effect.fail(rateLimited(ipResult.retryAfterSec))
    if (subject.action === "lobby") return
    const body = yield* request.json.pipe(Effect.catchAll(() => Effect.succeed({})))
    const result = yield* takePersistedRateLimitHit(
      studentLockoutKey(subject.code, body),
      PUBLIC_BANK_RATE_WINDOWS,
      nowMs
    ).pipe(Effect.orDie)
    if (!result.allowed) return yield* Effect.fail(rateLimited(result.retryAfterSec))
  }) as unknown as PublicBankIpRateLimit["Type"]
}

export const PublicBankIpRateLimitLive = Layer.succeed(
  PublicBankIpRateLimit,
  persistedRateLimitsEnabled()
    ? makePersistedIpRateLimitMiddleware()
    : makeIpRateLimitMiddleware(
      createRateLimitChecker(PUBLIC_BANK_RATE_WINDOWS),
      createRateLimitChecker(SESSION_IP_CEILING_WINDOWS)
    )
)

export type PublicBankRateLimitTestOpts = {
  windows: ReadonlyArray<{ windowMs: number; max: number }>
  now?: () => number
  ipCeiling?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
}

export function createTestPublicBankIpRateLimitLive(opts: PublicBankRateLimitTestOpts) {
  const now = opts.now
  const checker = createRateLimitChecker(
    opts.windows,
    now !== undefined ? { now } : {}
  )
  const ceilingNow = opts.ipCeiling?.now
  const ipCeiling = createRateLimitChecker(
    opts.ipCeiling?.windows ?? SESSION_IP_CEILING_WINDOWS,
    ceilingNow !== undefined ? { now: ceilingNow } : {}
  )
  return Layer.succeed(PublicBankIpRateLimit, makeIpRateLimitMiddleware(checker, ipCeiling))
}
