import type { PublicExamDetailResponse } from "@teacher-exam/shared"
import { PublicExamWithQuestionsSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither, downloadExport } from "./core.js"

export const publicExamsApi = {
  get: async (slug: string): Promise<Either.Either<PublicExamDetailResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/public/exams/${slug}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<PublicExamDetailResponse, ApiClientFailure>
    }
    return decodeEither(PublicExamWithQuestionsSchema, raw.right)
  },
  export: (slug: string, format: "pdf" | "docx", variant: "soal" | "kunci" | "pembahasan") => {
    const params = new URLSearchParams({ format, variant })
    return downloadExport(`/public/exams/${slug}/export?${params.toString()}`, `ujian.${format}`)
  }
}
