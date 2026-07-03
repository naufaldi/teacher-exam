import type {
  SessionDetailResponse,
  SessionStudent,
  StartSessionInput,
  SubmitSessionInput,
  SubmitSessionResponse
} from "@teacher-exam/shared"
import { SessionDetailResponseSchema, SessionStudentSchema, SubmitSessionResponseSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const sessionsApi = {
  public: {
    get: async (
      code: string
    ): Promise<Either.Either<SessionDetailResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/sessions/${code}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<SessionDetailResponse, ApiClientFailure>
      }
      return decodeEither(SessionDetailResponseSchema, raw.right)
    },
    start: async (
      code: string,
      input: StartSessionInput
    ): Promise<Either.Either<SessionStudent, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/sessions/${code}/start`, {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<SessionStudent, ApiClientFailure>
      }
      return decodeEither(SessionStudentSchema, raw.right)
    },
    submit: async (
      code: string,
      input: SubmitSessionInput
    ): Promise<Either.Either<SubmitSessionResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/sessions/${code}/submit`, {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<SubmitSessionResponse, ApiClientFailure>
      }
      return decodeEither(SubmitSessionResponseSchema, raw.right)
    }
  }
}
