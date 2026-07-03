import type {
  CurriculumBabTopicsResponse,
  CurriculumCatalogResponse,
  CurriculumTipsResponse,
  ExamSubject,
  Grade
} from "@teacher-exam/shared"
import {
  CurriculumBabTopicsResponseSchema,
  CurriculumCatalogResponseSchema,
  CurriculumTipsResponseSchema
} from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const curriculumApi = {
  catalog: async (): Promise<Either.Either<CurriculumCatalogResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>("/curriculum/catalog")
    if (Either.isLeft(raw)) {
      return raw as Either.Either<CurriculumCatalogResponse, ApiClientFailure>
    }
    return decodeEither(CurriculumCatalogResponseSchema, raw.right)
  },
  babTopics: async (
    subject: ExamSubject,
    grade: Grade
  ): Promise<Either.Either<CurriculumBabTopicsResponse, ApiClientFailure>> => {
    const params = new URLSearchParams({ subject, grade: String(grade) })
    const raw = await apiFetchEither<unknown>(`/curriculum/bab-topics?${params.toString()}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<CurriculumBabTopicsResponse, ApiClientFailure>
    }
    return decodeEither(CurriculumBabTopicsResponseSchema, raw.right)
  },
  tips: async (input: {
    subject: ExamSubject
    grade: Grade
  }): Promise<Either.Either<CurriculumTipsResponse, ApiClientFailure>> => {
    const params = new URLSearchParams({
      subject: input.subject,
      grade: String(input.grade)
    })
    const raw = await apiFetchEither<unknown>(`/curriculum/tips?${params.toString()}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<CurriculumTipsResponse, ApiClientFailure>
    }
    return decodeEither(CurriculumTipsResponseSchema, raw.right)
  }
}
