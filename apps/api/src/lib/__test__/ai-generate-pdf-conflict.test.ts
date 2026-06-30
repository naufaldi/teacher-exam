import { describe, expect, it } from "vitest"
import { pdfUploadLoadFailureToResult } from "../ai-generate"

describe("pdfUploadLoadFailureToResult", () => {
  it("maps 409 to conflict_error", () => {
    const result = pdfUploadLoadFailureToResult({
      status: 409,
      message: "PDF masih diproses."
    })
    expect(result).toEqual({
      _tag: "conflict_error",
      details: "PDF masih diproses."
    })
  })

  it("maps non-409 to validation_error", () => {
    const result = pdfUploadLoadFailureToResult({
      status: 404,
      message: "PDF tidak ditemukan."
    })
    expect(result).toEqual({
      _tag: "validation_error",
      details: "PDF tidak ditemukan."
    })
  })
})
