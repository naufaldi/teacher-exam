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
      let bucket = buckets.get(userId)
      if (!bucket) {
        bucket = { hits: windows.map(() => []) }
        buckets.set(userId, bucket)
      }

      const t = now()
      let retryAfterMs = 0

      for (let i = 0; i < windows.length; i++) {
        const w = windows[i]!
        const series = bucket.hits[i]!
        const cutoff = t - w.windowMs
        while (series.length > 0 && series[0]! <= cutoff) series.shift()
        if (series.length >= w.max) {
          const wait = series[0]! + w.windowMs - t
          if (wait > retryAfterMs) retryAfterMs = wait
        }
      }

      if (retryAfterMs > 0) {
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000))
        }
      }

      for (const series of bucket.hits) series.push(t)
      return { allowed: true }
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
