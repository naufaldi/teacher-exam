import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  AI_GENERATE_RATE_WINDOWS,
  closeRateLimitStore,
  createRateLimitChecker,
  takePersistedRateLimitHit
} from "../rate-limit-core"

function useRepoDatabaseUrl(): void {
  const envText = readFileSync(new URL("../../../../../../.env", import.meta.url), "utf8")
  for (const line of envText.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("DATABASE_URL=")) continue
    process.env["DATABASE_URL"] = trimmed.slice("DATABASE_URL=".length)
    return
  }
  throw new Error("DATABASE_URL is missing from the repo env file")
}

describe("AI day window", () => {
  it("returns the rate-limit error on the 31st hit in a day", () => {
    let now = 0
    const checker = createRateLimitChecker(AI_GENERATE_RATE_WINDOWS, { now: () => now })
    for (let hit = 0; hit < 30; hit++) {
      now = hit * 60_000
      expect(checker.check("ai:guru-1").allowed).toBe(true)
    }
    now = 30 * 60_000
    expect(checker.check("ai:guru-1")).toEqual({ allowed: false, retryAfterSec: 84_600 })
  })
})

describe("persisted rate limit counters", () => {
  beforeAll(() => {
    useRepoDatabaseUrl()
  })

  afterAll(async () => {
    await closeRateLimitStore()
  })

  it("denies a later check that reads the same stored hits", async () => {
    const key = `ai:persist-${crypto.randomUUID()}`
    const windows = [{ windowMs: 60_000, max: 1 }]
    const first = await Effect.runPromise(takePersistedRateLimitHit(key, windows, 1_000_000))
    const second = await Effect.runPromise(takePersistedRateLimitHit(key, windows, 1_000_000))
    expect(first).toEqual({ allowed: true })
    expect(second).toEqual({ allowed: false, retryAfterSec: 60 })
  })

  it("keeps a second key on its own counter", async () => {
    const windows = [{ windowMs: 60_000, max: 1 }]
    const firstKey = `bank:203.0.113.10-${crypto.randomUUID()}`
    const secondKey = `bank:203.0.113.11-${crypto.randomUUID()}`
    const first = await Effect.runPromise(takePersistedRateLimitHit(firstKey, windows, 1_000_000))
    const other = await Effect.runPromise(takePersistedRateLimitHit(secondKey, windows, 1_000_000))
    const again = await Effect.runPromise(takePersistedRateLimitHit(firstKey, windows, 1_000_000))
    expect(first).toEqual({ allowed: true })
    expect(other).toEqual({ allowed: true })
    expect(again).toEqual({ allowed: false, retryAfterSec: 60 })
  })
})
