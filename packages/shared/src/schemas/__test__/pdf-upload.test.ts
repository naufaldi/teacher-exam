import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { GenerateExamInputSchema } from "../api.js"
import {
  PdfUploadResponseSchema,
  PdfUploadStatusSchema,
  SourceModeSchema,
  validateGenerateExamInput
} from "../pdf-upload.js"

const pdfId = "550e8400-e29b-41d4-a716-446655440000"

describe("SourceModeSchema", () => {
  it("accepts default, pdf_guru, combine", () => {
    expect(Schema.decodeUnknownSync(SourceModeSchema)("default")).toBe("default")
    expect(Schema.decodeUnknownSync(SourceModeSchema)("pdf_guru")).toBe("pdf_guru")
    expect(Schema.decodeUnknownSync(SourceModeSchema)("combine")).toBe("combine")
  })
})

describe("PdfUploadResponseSchema", () => {
  it("decodes ready upload response", () => {
    const raw = {
      id: pdfId,
      status: "ready",
      filename: "worksheet.pdf",
      createdAt: "2026-06-29T00:00:00.000Z"
    }
    const decoded = Schema.decodeUnknownSync(PdfUploadResponseSchema)(raw)
    expect(decoded.status).toBe("ready")
    expect(decoded.filename).toBe("worksheet.pdf")
  })
})

describe("validateGenerateExamInput", () => {
  const base = {
    subject: "ipas",
    grade: 5,
    difficulty: "sedang",
    topics: ["Bab 1: Lingkungan"],
    reviewMode: "fast"
  } as const

  it("allows default mode without pdfUploadId", () => {
    const input = Schema.decodeUnknownSync(GenerateExamInputSchema)({
      ...base,
      sourceMode: "default"
    })
    expect(validateGenerateExamInput(input)).toBeNull()
  })

  it("rejects pdf_guru without pdfUploadId", () => {
    const input = Schema.decodeUnknownSync(GenerateExamInputSchema)({
      ...base,
      sourceMode: "pdf_guru",
      freeTopic: "Ekosistem dan pencemaran"
    })
    expect(validateGenerateExamInput(input)).toMatch(/PDF/i)
  })

  it("rejects pdf_guru without freeTopic", () => {
    const input = Schema.decodeUnknownSync(GenerateExamInputSchema)({
      ...base,
      sourceMode: "pdf_guru",
      pdfUploadId: pdfId
    })
    expect(validateGenerateExamInput(input)).toMatch(/topik/i)
  })

  it("rejects combine without pdfUploadId", () => {
    const input = Schema.decodeUnknownSync(GenerateExamInputSchema)({
      ...base,
      sourceMode: "combine"
    })
    expect(validateGenerateExamInput(input)).toMatch(/PDF/i)
  })

  it("accepts pdf_guru with pdf and freeTopic", () => {
    const input = Schema.decodeUnknownSync(GenerateExamInputSchema)({
      ...base,
      sourceMode: "pdf_guru",
      pdfUploadId: pdfId,
      freeTopic: "Ekosistem dan pencemaran lingkungan"
    })
    expect(validateGenerateExamInput(input)).toBeNull()
  })
})

describe("PdfUploadStatusSchema", () => {
  it("accepts lifecycle statuses", () => {
    for (const status of ["uploaded", "processing", "ready", "failed"] as const) {
      expect(Schema.decodeUnknownSync(PdfUploadStatusSchema)(status)).toBe(status)
    }
  })
})
