import { Either, Schema } from "effect"
import { describe, expect, test } from "vitest"
import { SubjectCatalogItemSchema } from "../catalog.js"

const VALID_CATALOG_ITEM = {
  key: "bahasa_indonesia",
  label: "Bahasa Indonesia",
  family: "bahasa",
  optional: false,
  grades: [
    { grade: 1, phase: "A", availability: "missing" },
    { grade: 4, phase: "B", availability: "stubbed" },
    { grade: 6, phase: "C", availability: "ready" }
  ]
} as const

describe("SubjectCatalogItemSchema", () => {
  test("decodes a valid subject catalog item with mixed grade availability", () => {
    const result = Schema.decodeUnknownEither(SubjectCatalogItemSchema)(VALID_CATALOG_ITEM)
    expect(Either.isRight(result)).toBe(true)
  })

  test("rejects empty grades", () => {
    const result = Schema.decodeUnknownEither(SubjectCatalogItemSchema)({
      ...VALID_CATALOG_ITEM,
      grades: []
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects invalid phase inside grades", () => {
    const result = Schema.decodeUnknownEither(SubjectCatalogItemSchema)({
      ...VALID_CATALOG_ITEM,
      grades: [{ grade: 1, phase: "D", availability: "ready" }]
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects invalid availability inside grades", () => {
    const result = Schema.decodeUnknownEither(SubjectCatalogItemSchema)({
      ...VALID_CATALOG_ITEM,
      grades: [{ grade: 1, phase: "A", availability: "archived" }]
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})
