import type { SessionResult, SessionResultsResponse } from "@teacher-exam/shared"
import { SessionResultSchema, SessionResultsResponseSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const resultsApi = {
  listByExam: async (
    examId: string
  ): Promise<Either.Either<SessionResultsResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/exams/${examId}/results`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<SessionResultsResponse, ApiClientFailure>
    }
    return decodeEither(SessionResultsResponseSchema, raw.right)
  },
  list: async (
    sessionId: string
  ): Promise<Either.Either<SessionResultsResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/sessions/${sessionId}/results`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<SessionResultsResponse, ApiClientFailure>
    }
    return decodeEither(SessionResultsResponseSchema, raw.right)
  },
  get: async (id: string): Promise<Either.Either<SessionResult, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/results/${id}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<SessionResult, ApiClientFailure>
    }
    return decodeEither(SessionResultSchema, raw.right)
  }
}
