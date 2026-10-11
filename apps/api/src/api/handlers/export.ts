import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { user } from "@teacher-exam/db"
import {
  BLANK_SCHOOL_NAME,
  type ExportFormat,
  type ExportVariant,
  resolveExamSubjectLabel,
  type SchoolKop
} from "@teacher-exam/shared"
import { eq } from "drizzle-orm"
import { Effect, Match, Schema } from "effect"
import { fetchExamWithQuestions, fetchPublicExamWithQuestions } from "../../lib/exams-query"
import { TeacherExamApi } from "../definition"
import { ApiBadRequest, ApiDatabaseError, ApiNotFound } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { CurrentUser } from "../middleware/auth"
import { DbClient } from "../services/db"
import { ExportService } from "../services/export-service"

const UserKopRowSchema = Schema.Struct({
  school: Schema.optional(Schema.NullOr(Schema.String)),
  schoolAddress: Schema.optional(Schema.NullOr(Schema.String)),
  schoolLogo: Schema.optional(Schema.NullOr(Schema.String))
})

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

function variantFileToken(variant: ExportVariant): string {
  return Match.value(variant).pipe(
    Match.when("kisi_kisi", () => "-kisi-kisi"),
    Match.when("kartu_soal", () => "-kartu-soal"),
    Match.when("soal", () => ""),
    Match.when("kunci", () => ""),
    Match.when("pembahasan", () => ""),
    Match.exhaustive
  )
}

function buildBinaryResponse(
  bytes: Uint8Array,
  format: ExportFormat,
  examTitle: string,
  variant: ExportVariant
): Response {
  const ext = fileExtensionFor(format)
  const base = sanitizeFileName(examTitle) || "ujian"
  const fileName = `${base}${variantFileToken(variant)}.${ext}`
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(format),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(bytes.byteLength)
    }
  })
}

function resolveVariant(input: ExportVariant | undefined): ExportVariant {
  return input ?? DEFAULT_VARIANT
}

function kopFromUserRow(row: unknown, examSchoolName: string | null): SchoolKop {
  const decoded = Schema.decodeUnknownEither(UserKopRowSchema)(row ?? {})
  const school = decoded._tag === "Right" ? decoded.right.school ?? null : null
  const address = decoded._tag === "Right" ? decoded.right.schoolAddress ?? null : null
  const logo = decoded._tag === "Right" ? decoded.right.schoolLogo ?? null : null
  return {
    name: school?.trim() || examSchoolName?.trim() || BLANK_SCHOOL_NAME,
    address: address?.trim() ?? "",
    logoDataUrl: logo
  }
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

        const db = yield* DbClient
        const userRows = yield* runDb(
          db.select().from(user).where(eq(user.id, userId)).limit(1)
        )
        const examWithKop = { ...exam, kop: kopFromUserRow(userRows[0], exam.schoolName) }

        const bytes = yield* (format === "pdf"
          ? exportService.exportExamPdf(examWithKop, { variant })
          : exportService.exportExamDocx(examWithKop, { variant })).pipe(
            Effect.catchTags({
              ExportError: (e) =>
                Effect.fail(
                  new ApiDatabaseError({ error: `Export failed: ${e.reason}`, code: "DATABASE_ERROR" })
                )
            })
          )

        return HttpServerResponse.fromWeb(buildBinaryResponse(bytes, format, exam.title, variant))
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
        return HttpServerResponse.fromWeb(buildBinaryResponse(bytes, format, title, variant))
      }))
)
