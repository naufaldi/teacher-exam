import { afterEach, describe, expect, it, vi } from "vitest"
import { Data, Effect } from "effect"
import { logDomainError, withLoggedErrors } from "../effect-log.js"

class SampleError extends Data.TaggedError("SampleError")<{
  detail: string
}> {}

class OtherError extends Data.TaggedError("OtherError")<{
  reason: string
}> {}

describe("effect-log", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("logDomainError routes tagged errors with a _tag to logWarn/logError based on kind", () => {
    vi.stubEnv("NODE_ENV", "production")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const effect = Effect.fail(new SampleError({ detail: "boom" })).pipe(
      Effect.catchAll((e) =>
        logDomainError("bank.save", e, { kind: "expected" })
      )
    )

    return Effect.runPromise(effect).then(() => {
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).not.toHaveBeenCalled()
      const line = warnSpy.mock.calls[0]?.[0]
      const obj = JSON.parse(line as string) as Record<string, unknown>
      expect(obj).toMatchObject({
        level: "warn",
        msg: "bank.save_failed",
        extra: { tag: "SampleError", kind: "expected", detail: "boom" }
      })
    })
  })

  it("logDomainError routes unknown kind to logError", () => {
    vi.stubEnv("NODE_ENV", "production")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const effect = Effect.fail(new OtherError({ reason: "kaboom" })).pipe(
      Effect.catchAll((e) =>
        logDomainError("bank.publish", e, { kind: "unexpected" })
      )
    )

    return Effect.runPromise(effect).then(() => {
      expect(errorSpy).toHaveBeenCalledTimes(1)
      const line = errorSpy.mock.calls[0]?.[0]
      const obj = JSON.parse(line as string) as Record<string, unknown>
      expect(obj).toMatchObject({
        level: "error",
        msg: "bank.publish_failed",
        extra: { tag: "OtherError", kind: "unexpected", reason: "kaboom" }
      })
    })
  })

  it("logDomainError falls back to a generic payload for non-tagged errors", () => {
    vi.stubEnv("NODE_ENV", "production")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const effect = Effect.fail("plain string error" as never).pipe(
      Effect.catchAll((e) =>
        logDomainError("misc", e, { kind: "unexpected" })
      )
    )

    return Effect.runPromise(effect).then(() => {
      expect(errorSpy).toHaveBeenCalledTimes(1)
      const line = errorSpy.mock.calls[0]?.[0]
      const obj = JSON.parse(line as string) as Record<string, unknown>
      expect(obj["msg"]).toBe("misc_failed")
      const extra = obj["extra"] as Record<string, unknown>
      expect(extra["tag"]).toBe("unknown")
      expect(extra["cause"]).toBe("plain string error")
    })
  })

  it("withLoggedErrors preserves the original error after logging", () => {
    vi.stubEnv("NODE_ENV", "production")
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const failing = Effect.fail(new SampleError({ detail: "captured" }))

    const wrapped = withLoggedErrors("bank.propagate", failing, {
      kind: "expected"
    })

    return Effect.runPromise(Effect.either(wrapped)).then((result) => {
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("SampleError")
      }
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })
  })

  it("withLoggedErrors does not log on success", () => {
    vi.stubEnv("NODE_ENV", "production")
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const wrapped = withLoggedErrors("bank.browse", Effect.succeed(42), {
      kind: "expected"
    })

    return Effect.runPromise(wrapped).then((value) => {
      expect(value).toBe(42)
      expect(warnSpy).not.toHaveBeenCalled()
    })
  })
})

import { Either } from "effect"
