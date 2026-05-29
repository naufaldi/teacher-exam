import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  ApiNotFound,
  ApiRateLimited,
  ApiUnauthorizedSimple,
  ApiUnauthorizedWithCode,
  ApiValidationError422
} from "../http"

describe("HttpApi error schemas", () => {
  it("encodes ApiUnauthorizedSimple without code field", () => {
    const encoded = Schema.encodeSync(ApiUnauthorizedSimple)(new ApiUnauthorizedSimple({ error: "Unauthorized" }))
    expect(encoded).toEqual({ error: "Unauthorized", _tag: "ApiUnauthorizedSimple" })
  })

  it("encodes ApiUnauthorizedWithCode with code field", () => {
    const encoded = Schema.encodeSync(ApiUnauthorizedWithCode)(
      new ApiUnauthorizedWithCode({ error: "Unauthorized", code: "UNAUTHORIZED" })
    )
    expect(encoded).toMatchObject({ error: "Unauthorized", code: "UNAUTHORIZED" })
  })

  it("encodes ApiNotFound with NOT_FOUND code", () => {
    const encoded = Schema.encodeSync(ApiNotFound)(
      new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
    )
    expect(encoded).toMatchObject({ code: "NOT_FOUND" })
  })

  it("encodes ApiRateLimited with retryAfterSec", () => {
    const encoded = Schema.encodeSync(ApiRateLimited)(
      new ApiRateLimited({
        error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
        code: "RATE_LIMITED",
        retryAfterSec: 12
      })
    )
    expect(encoded).toMatchObject({ code: "RATE_LIMITED", retryAfterSec: 12 })
  })

  it("encodes ApiValidationError422 with details", () => {
    const encoded = Schema.encodeSync(ApiValidationError422)(
      new ApiValidationError422({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: "bad input"
      })
    )
    expect(encoded).toMatchObject({ code: "VALIDATION_ERROR", details: "bad input" })
  })
})
