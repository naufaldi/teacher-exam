import type { ClassAnalyticsResponse, ExamAnalyticsResponse } from "@teacher-exam/shared"
import { ClassAnalyticsResponseSchema, ExamAnalyticsResponseSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const analyticsApi = {
  getByExam: async (
    examId: string
  ): Promise<Either.Either<ExamAnalyticsResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/analytics/exams/${examId}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<ExamAnalyticsResponse, ApiClientFailure>
    }
    return decodeEither(ExamAnalyticsResponseSchema, raw.right)
  },
  getByClass: async (
    classId: string
  ): Promise<Either.Either<ClassAnalyticsResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/analytics/classes/${classId}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<ClassAnalyticsResponse, ApiClientFailure>
    }
    return decodeEither(ClassAnalyticsResponseSchema, raw.right)
  }
}
