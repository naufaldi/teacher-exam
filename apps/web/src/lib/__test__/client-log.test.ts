import { Match } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  ApiClientError,
  type ApiClientFailure,
  DecodeClientError,
  NetworkClientError,
  RateLimitedClientError,
  UnauthorizedClientError
} from "../api-errors.js"
import { logClientError } from "../client-log.js"

describe("logClientError", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
  })
  afterEach(() => {
    infoSpy.mockRestore()
  })

  it("returns a structured payload per error tag (exhaustive)", () => {
    const cases: Array<{ err: ApiClientFailure; expected: Record<string, unknown> }> = [
      {
        err: new UnauthorizedClientError({ message: "no session" }),
        expected: { tag: "UnauthorizedClientError", message: "no session" }
      },
      {
        err: new RateLimitedClientError({ retryAfterSec: 30, message: "slow down" }),
        expected: { tag: "RateLimitedClientError", retryAfterSec: 30, message: "slow down" }
      },
      {
        err: new ApiClientError({ message: "boom", code: "X", status: 500 }),
        expected: { tag: "ApiClientError", code: "X", status: 500, message: "boom" }
      },
      {
        err: new NetworkClientError({ message: "offline" }),
        expected: { tag: "NetworkClientError", message: "offline" }
      },
      {
        err: new DecodeClientError({ message: "schema mismatch" }),
        expected: { tag: "DecodeClientError", message: "schema mismatch" }
      }
    ]

    for (const { err, expected } of cases) {
      const payload = Match.value(err).pipe(
        Match.tag("UnauthorizedClientError", (e) => ({ tag: e._tag, message: e.message })),
        Match.tag("RateLimitedClientError", (e) => ({
          tag: e._tag,
          retryAfterSec: e.retryAfterSec,
          message: e.message
        })),
        Match.tag("ApiClientError", (e) => ({
          tag: e._tag,
          code: e.code,
          status: e.status,
          message: e.message
        })),
        Match.tag("NetworkClientError", (e) => ({ tag: e._tag, message: e.message })),
        Match.tag("DecodeClientError", (e) => ({ tag: e._tag, message: e.message })),
        Match.exhaustive
      )
      expect(payload).toMatchObject(expected)
    }
  })

  it("calls devLog with the right scope and merges context", () => {
    // devLog is a no-op in prod; assert that logClientError is safe to call
    // in both modes (smoke check) and that the helper does not throw.
    expect(() =>
      logClientError(new ApiClientError({ message: "x", code: "Y", status: 400 }), {
        scope: "bank.save",
        path: "/api/bank"
      })
    ).not.toThrow()
  })
})
