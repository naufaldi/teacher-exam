import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { CurriculumValidationItemSchema } from "../api.js"

describe("CurriculumValidationItemSchema", () => {
  it("decodes a valid curriculum validation item", () => {
    const decoded = Schema.decodeUnknownEither(CurriculumValidationItemSchema)({
      number: 1,
      status: "valid",
      reason: "Sesuai CP."
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects invalid status literals", () => {
    const decoded = Schema.decodeUnknownEither(CurriculumValidationItemSchema)({
      number: 1,
      status: "ok",
      reason: "x"
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })
})
