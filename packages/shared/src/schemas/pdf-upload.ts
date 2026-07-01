import { Schema } from "effect"
import type { GenerateExamInput } from "./api.js"
import { PdfUploadIdSchema } from "./entities.js"

export const SourceModeSchema = Schema.Literal("default", "pdf_guru", "combine")
export type SourceMode = typeof SourceModeSchema.Type

export const PdfUploadStatusSchema = Schema.Literal(
  "uploaded",
  "processing",
  "ready",
  "failed"
)
export type PdfUploadStatus = typeof PdfUploadStatusSchema.Type

export const PdfUploadResponseSchema = Schema.Struct({
  id: PdfUploadIdSchema,
  status: PdfUploadStatusSchema,
  filename: Schema.String,
  createdAt: Schema.String
})
export type PdfUploadResponse = typeof PdfUploadResponseSchema.Type

export const PdfUploadSummarySchema = Schema.Struct({
  id: PdfUploadIdSchema,
  status: PdfUploadStatusSchema,
  filename: Schema.String,
  fileSize: Schema.Int,
  createdAt: Schema.String,
  readyAt: Schema.optional(Schema.String)
})
export type PdfUploadSummary = typeof PdfUploadSummarySchema.Type

export const PdfUploadListResponseSchema = Schema.Struct({
  items: Schema.Array(PdfUploadSummarySchema)
})
export type PdfUploadListResponse = typeof PdfUploadListResponseSchema.Type

export const PdfUploadDetailSchema = Schema.Struct({
  id: PdfUploadIdSchema,
  status: PdfUploadStatusSchema,
  filename: Schema.String,
  pageCount: Schema.optional(Schema.Int),
  errorMessage: Schema.optional(Schema.String),
  createdAt: Schema.String,
  readyAt: Schema.optional(Schema.String)
})
export type PdfUploadDetail = typeof PdfUploadDetailSchema.Type

export function validateGenerateExamInput(input: GenerateExamInput): string | null {
  const sourceMode = input.sourceMode ?? "default"

  if (sourceMode === "default" || sourceMode === "combine") {
    if (input.subject === undefined) {
      return "Pilih mata pelajaran."
    }
    if (input.subjectLabel !== undefined) {
      return "Mata pelajaran bebas hanya untuk mode PDF saya saja."
    }
  }

  if (sourceMode === "pdf_guru") {
    if (input.subject !== undefined) {
      return "Mode PDF saya saja memakai nama mata pelajaran bebas, bukan pilihan kurikulum."
    }
    const label = input.subjectLabel?.trim() ?? ""
    if (label.length < 2) {
      return "Mata pelajaran wajib diisi (minimal 2 karakter)."
    }
  }

  if (sourceMode === "default") {
    return null
  }

  if (!input.pdfUploadId) {
    return "Pilih atau upload PDF materi guru."
  }

  if (sourceMode === "pdf_guru") {
    const topic = input.freeTopic?.trim() ?? ""
    if (topic.length < 10) {
      return "Topik bebas wajib diisi (minimal 10 karakter)."
    }
    return null
  }

  if (sourceMode === "combine") {
    if (input.topics.length < 1) {
      return "Pilih minimal satu Bab."
    }
    return null
  }

  return null
}
