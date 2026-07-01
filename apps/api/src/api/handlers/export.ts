import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { type ExportFormat, type ExportVariant, resolveExamSubjectLabel } from "@teacher-exam/shared"
import { Effect } from "effect"
import { fetchExamWithQuestions, fetchPublicExamWithQuestions } from "../../lib/exams-query"
import { TeacherExamApi } from "../definition"
import { ApiBadRequest, ApiDatabaseError, ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { ExportService } from "../services/export-service"

const DEFAULT_VARIANT: ExportVariant = "soal"

function contentTypeFor(format: ExportFormat): string {
  return format === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

function fileExtensionFor(format: ExportFormat): string {
  return format === "pdf" ? "pdf" : "docx"
}

function sanitizeFileName(name: string): string {
  return name.replaceAll(/[^\w\-.\s]/g, "").trim().replaceAll(/\s+/g, "_").slice(0, 80)
}

function buildBinaryResponse(
  bytes: Uint8Array,
  format: ExportFormat,
  examTitle: string
): Response {
  const ext = fileExtensionFor(format)
  const base = sanitizeFileName(examTitle) || "ujian"
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(format),
      "Content-Disposition": `attachment; filename="${base}.${ext}"`,
      "Content-Length": String(bytes.byteLength)
    }
  })
}

function resolveVariant(input: ExportVariant | undefined): ExportVariant {
  return input ?? DEFAULT_VARIANT
}

export const ExportsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "exports",
  (handlers) =>
    handlers.handleRaw("exportExam", ({ path, urlParams }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const exportService = yield* ExportService
        const format = urlParams.format
        const variant = resolveVariant(urlParams.variant)

        const exam = yield* fetchExamWithQuestions(path.id)
        if (!exam || exam.userId !== userId) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }
        if (exam.status !== "final") {
          return yield* Effect.fail(
            new ApiBadRequest({
              error: "Exam must be finalized before exporting",
              code: "BAD_REQUEST"
            })
          )
        }

        const bytes = yield* (format === "pdf"
          ? exportService.exportExamPdf(exam, { variant })
          : exportService.exportExamDocx(exam, { variant })).pipe(
            Effect.catchTags({
              ExportError: (e) =>
                Effect.fail(
                  new ApiDatabaseError({ error: `Export failed: ${e.reason}`, code: "DATABASE_ERROR" })
                )
            })
          )

        return HttpServerResponse.fromWeb(buildBinaryResponse(bytes, format, exam.title))
      }))
)

export const PublicExportsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "publicExports",
  (handlers) =>
    handlers.handleRaw("exportPublicExam", ({ path, urlParams }) =>
      Effect.gen(function*() {
        const exportService = yield* ExportService
        const format = urlParams.format
        const variant = resolveVariant(urlParams.variant)

        const exam = yield* fetchPublicExamWithQuestions(path.slug)
        if (!exam) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Public exam not found", code: "NOT_FOUND" })
          )
        }

        const bytes = yield* (format === "pdf"
          ? exportService.exportExamPdf(exam, { variant })
          : exportService.exportExamDocx(exam, { variant })).pipe(
            Effect.catchTags({
              ExportError: (e) =>
                Effect.fail(
                  new ApiDatabaseError({ error: `Export failed: ${e.reason}`, code: "DATABASE_ERROR" })
                )
            })
          )

        const title = `${resolveExamSubjectLabel(exam)} · Kelas ${exam.grade}`
        return HttpServerResponse.fromWeb(buildBinaryResponse(bytes, format, title))
      }))
)
