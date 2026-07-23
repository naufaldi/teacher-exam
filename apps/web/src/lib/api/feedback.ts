import type { ExamPilotOutcome, SetExamPilotOutcomeInput } from "@teacher-exam/shared"
import { ExamPilotOutcomeSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const feedbackApi = {
  setExamOutcome: async (
    examId: string,
    input: SetExamPilotOutcomeInput
  ): Promise<Either.Either<ExamPilotOutcome, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/feedback/exams/${examId}/outcome`, {
      method: "PUT",
      body: JSON.stringify(input)
    })
    if (Either.isLeft(raw)) {
      return raw as Either.Either<ExamPilotOutcome, ApiClientFailure>
    }
    return decodeEither(ExamPilotOutcomeSchema, raw.right)
  }
}
