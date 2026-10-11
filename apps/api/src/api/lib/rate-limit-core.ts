import { Data, Effect, Match, Schema } from "effect"
import pg from "pg"

export type RateWindow = {
  readonly windowMs: number
  readonly max: number
}

type Bucket = {
  readonly hits: Array<Array<number>>
}

export type RateLimitCheckResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSec: number }

export type RateLimitChecker = {
  check(userId: string): RateLimitCheckResult
  reset(): void
}

const HitsSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Array(Schema.Number)
})

export class RateLimitStoreError extends Data.TaggedError("RateLimitStoreError")<{
  readonly message: string
}> {}

export function decideRateLimit(
  seriesByWindow: ReadonlyArray<ReadonlyArray<number>>,
  windows: ReadonlyArray<RateWindow>,
  nowMs: number
): { readonly result: RateLimitCheckResult; readonly next: Array<Array<number>> } {
  const pruned = windows.map((window, index) => {
    const cutoff = nowMs - window.windowMs
    return (seriesByWindow[index] ?? []).filter((hit) => hit > cutoff)
  })

  let retryAfterMs = 0
  for (let index = 0; index < windows.length; index++) {
    const window = windows[index]!
    const series = pruned[index]!
    if (series.length >= window.max && series[0] !== undefined) {
      const wait = series[0] + window.windowMs - nowMs
      if (wait > retryAfterMs) retryAfterMs = wait
    }
  }

  if (retryAfterMs > 0) {
    return {
      result: {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000))
      },
      next: pruned
    }
  }

  return {
    result: { allowed: true },
    next: pruned.map((series) => [...series, nowMs])
  }
}

export function createRateLimitChecker(
  windows: ReadonlyArray<RateWindow>,
  opts: { now?: () => number } = {}
): RateLimitChecker {
  if (windows.length === 0) {
    throw new Error("createRateLimitChecker requires at least one window")
  }
  const now = opts.now ?? (() => Date.now())
  const buckets = new Map<string, Bucket>()

  return {
    check(userId: string): RateLimitCheckResult {
      const bucket = buckets.get(userId) ?? { hits: windows.map(() => []) }
      const decision = decideRateLimit(bucket.hits, windows, now())
      buckets.set(userId, { hits: decision.next })
      return decision.result
    },
    reset() {
      buckets.clear()
    }
  }
}

export const GLOBAL_RATE_WINDOWS: ReadonlyArray<RateWindow> = [{ windowMs: 60_000, max: 60 }]

export const AI_GENERATE_RATE_WINDOWS: ReadonlyArray<RateWindow> = [
  { windowMs: 60_000, max: 5 },
  { windowMs: 24 * 60 * 60_000, max: 30 }
]

export const PDF_UPLOAD_RATE_WINDOWS: ReadonlyArray<RateWindow> = [
  { windowMs: 60_000, max: 10 },
  { windowMs: 24 * 60 * 60_000, max: 50 }
]

export function persistedRateLimitsEnabled(): boolean {
  return process.env["VITEST"] !== "true"
}

let pool: pg.Pool | undefined

function rateLimitPool(): pg.Pool {
  if (pool !== undefined) return pool
  const connectionString = process.env["DATABASE_URL"]
  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error("DATABASE_URL is not set")
  }
  pool = new pg.Pool({ connectionString, max: 4 })
  return pool
}

export async function closeRateLimitStore(): Promise<void> {
  if (pool === undefined) return
  const current = pool
  pool = undefined
  await current.end()
}

function seriesFromStoredHits(raw: unknown, windows: ReadonlyArray<RateWindow>): Array<Array<number>> {
  const parsed = typeof raw === "string" ? parseHitsJson(raw) : (raw ?? {})
  const decoded = Schema.decodeUnknownEither(HitsSchema)(parsed)
  return Match.value(decoded).pipe(
    Match.tag("Left", () => windows.map(() => [])),
    Match.tag("Right", (right) => windows.map((window) => [...(right.right[String(window.windowMs)] ?? [])])),
    Match.exhaustive
  )
}

function parseHitsJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return {}
  }
}

function hitsPayload(
  next: ReadonlyArray<ReadonlyArray<number>>,
  windows: ReadonlyArray<RateWindow>
): string {
  const hits: Record<string, Array<number>> = {}
  for (let index = 0; index < windows.length; index++) {
    const window = windows[index]!
    hits[String(window.windowMs)] = [...(next[index] ?? [])]
  }
  return JSON.stringify(hits)
}

async function writePersistedHit(
  key: string,
  windows: ReadonlyArray<RateWindow>,
  nowMs: number
): Promise<RateLimitCheckResult> {
  if (windows.length === 0) {
    throw new Error("takePersistedRateLimitHit requires at least one window")
  }
  const client = await rateLimitPool().connect()
  try {
    await client.query("BEGIN")
    await client.query(
      `INSERT INTO rate_limit_counters (bucket_key, hits)
       VALUES ($1, '{}'::jsonb)
       ON CONFLICT (bucket_key) DO NOTHING`,
      [key]
    )
    const selected = await client.query<{ hits: unknown }>(
      "SELECT hits FROM rate_limit_counters WHERE bucket_key = $1 FOR UPDATE",
      [key]
    )
    const decision = decideRateLimit(seriesFromStoredHits(selected.rows[0]?.hits, windows), windows, nowMs)
    await client.query(
      "UPDATE rate_limit_counters SET hits = $2::jsonb, updated_at = now() WHERE bucket_key = $1",
      [key, hitsPayload(decision.next, windows)]
    )
    await client.query("COMMIT")
    return decision.result
  } catch (cause) {
    await client.query("ROLLBACK")
    throw cause
  } finally {
    client.release()
  }
}

export function takePersistedRateLimitHit(
  key: string,
  windows: ReadonlyArray<RateWindow>,
  nowMs: number
): Effect.Effect<RateLimitCheckResult, RateLimitStoreError> {
  return Effect.tryPromise({
    try: () => writePersistedHit(key, windows, nowMs),
    catch: (cause) =>
      new RateLimitStoreError({
        message: cause instanceof Error ? cause.message : String(cause)
      })
  })
}
