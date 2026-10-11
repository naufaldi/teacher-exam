import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { UpdateProfileInputSchema } from "../api.js"
import { SchoolAddressSchema, SchoolLogoDataUrlSchema } from "../entities.js"

const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

describe("school kop profile fields", () => {
  it("accepts a png data URL and a street address", () => {
    const logo = Schema.decodeUnknownEither(SchoolLogoDataUrlSchema)(LOGO)
    const address = Schema.decodeUnknownEither(SchoolAddressSchema)("Jl. Melati No. 12")
    expect(logo._tag).toBe("Right")
    expect(address._tag).toBe("Right")
    if (logo._tag === "Right") expect(logo.right).toBe(LOGO)
    if (address._tag === "Right") expect(address.right).toBe("Jl. Melati No. 12")
  })

  it("rejects a webp logo, an oversized logo, and a 201 character address", () => {
    const webp = Schema.decodeUnknownEither(SchoolLogoDataUrlSchema)("data:image/webp;base64,AAAA")
    const oversized = Schema.decodeUnknownEither(SchoolLogoDataUrlSchema)(
      "data:image/png;base64," + "A".repeat(120 * 1024)
    )
    const longAddress = Schema.decodeUnknownEither(SchoolAddressSchema)("a".repeat(201))
    const brokenLine = Schema.decodeUnknownEither(SchoolAddressSchema)("Jl.\nMelati")
    expect(webp._tag).toBe("Left")
    expect(oversized._tag).toBe("Left")
    expect(longAddress._tag).toBe("Left")
    expect(brokenLine._tag).toBe("Left")
    expect(Either.isLeft(webp)).toBe(true)
  })

  it("accepts a profile patch that clears the logo", () => {
    const decoded = Schema.decodeUnknownEither(UpdateProfileInputSchema)({
      schoolAddress: "Jl. Melati No. 12",
      schoolLogo: null
    })
    expect(decoded._tag).toBe("Right")
    if (decoded._tag === "Right") {
      expect(decoded.right.schoolAddress).toBe("Jl. Melati No. 12")
      expect(decoded.right.schoolLogo).toBe(null)
    }
  })
})
