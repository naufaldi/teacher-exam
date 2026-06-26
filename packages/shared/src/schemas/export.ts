import { Schema } from "effect"

export const ExportFormatSchema = Schema.Literal("pdf", "docx")
export type ExportFormat = typeof ExportFormatSchema.Type

export const ExportVariantSchema = Schema.Literal("soal", "kunci", "pembahasan")
export type ExportVariant = typeof ExportVariantSchema.Type

export const ExportQuerySchema = Schema.Struct({
  format: ExportFormatSchema,
  variant: Schema.optional(ExportVariantSchema)
})
export type ExportQuery = typeof ExportQuerySchema.Type

export const ExportOptionsSchema = Schema.Struct({
  variant: ExportVariantSchema
})
export type ExportOptions = typeof ExportOptionsSchema.Type

/** URL query string params (strings from the URL) for export endpoints. */
export const ExportUrlParamsSchema = Schema.Struct({
  format: ExportFormatSchema,
  variant: Schema.optional(ExportVariantSchema)
})
export type ExportUrlParams = typeof ExportUrlParamsSchema.Type

export const DEFAULT_EXPORT_VARIANT: ExportVariant = "soal"
