import type { MiddlewareHandler } from 'hono'

/**
 * In-memory sliding-window rate limiter keyed by `userId` (set by
 * {@link requireAuth}). Multiple windows per limiter let us combine, e.g.,
 * a per-minute and per-day quota on the same endpoint.
 *
 * Suitable for single-process MVP. Replace with a Redis-backed store when
 * the API runs on more than one instance.
 */
export type RateWindow = {
  /** Window length in milliseconds. */
  readonly windowMs: number
  /** Maximum allowed requests per user in the window. */
  readonly max: number
}

type Bucket = {
  /** Per-window timestamps, oldest first. */
  readonly hits: Array<number[]>
}

export type RateLimiter = MiddlewareHandler & {
  /** Test helper: reset all in-memory state. */
  reset(): void
}

/**
 * Build a Hono middleware enforcing the supplied windows for the current
 * `userId`. On hit, returns 429 with `{ error, code: 'RATE_LIMITED', retryAfterSec }`
 * and a `Retry-After` header.
 */
export function createRateLimiter(
  windows: readonly RateWindow[],
  opts: { now?: () => number; label?: string } = {},
): RateLimiter {
  if (windows.length === 0) {
    throw new Error('createRateLimiter requires at least one window')
  }
  const now = opts.now ?? (() => Date.now())
  const buckets = new Map<string, Bucket>()

  const middleware: MiddlewareHandler = async (c, next) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

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
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000))
      c.header('Retry-After', String(retryAfterSec))
      return c.json(
        {
          error: 'Terlalu banyak permintaan. Silakan coba lagi sebentar.',
          code: 'RATE_LIMITED',
          retryAfterSec,
        },
        429,
      )
    }

    for (const series of bucket.hits) series.push(t)
    await next()
  }

  const limiter = middleware as RateLimiter
  limiter.reset = () => buckets.clear()
  return limiter
}

/** 60 requests per minute per authenticated user. */
export const globalLimiter = createRateLimiter(
  [{ windowMs: 60_000, max: 60 }],
  { label: 'global' },
)

/** 5 requests per minute and 30 per day per authenticated user. */
export const aiGenerateLimiter = createRateLimiter(
  [
    { windowMs: 60_000, max: 5 },
    { windowMs: 24 * 60 * 60_000, max: 30 },
  ],
  { label: 'ai-generate' },
)
