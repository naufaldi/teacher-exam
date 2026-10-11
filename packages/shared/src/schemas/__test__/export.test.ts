import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { ExportVariantSchema } from "../export.js"

describe("ExportVariantSchema", () => {
  it("decodes kisi-kisi and kartu soal", () => {
    const kisi = Schema.decodeUnknownEither(ExportVariantSchema)("kisi_kisi")
    const kartu = Schema.decodeUnknownEither(ExportVariantSchema)("kartu_soal")
    expect(Either.isRight(kisi)).toBe(true)
    expect(Either.isRight(kartu)).toBe(true)
  })
})
