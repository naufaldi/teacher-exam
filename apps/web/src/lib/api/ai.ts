import type { ExamWithQuestions, GenerateExamInput } from "@teacher-exam/shared"
import { ExamWithQuestionsSchema, GenerateJobStartedSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export type GenerateApiResult =
  | { readonly kind: "sync"; readonly exam: ExamWithQuestions }
  | { readonly kind: "async"; readonly examId: string; readonly jobId: string }

export const aiApi = {
  generate: async (
    input: GenerateExamInput
  ): Promise<Either.Either<GenerateApiResult, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>("/ai/generate", {
      method: "POST",
      body: JSON.stringify(input)
    })
    if (Either.isLeft(raw)) {
      return raw as Either.Either<GenerateApiResult, ApiClientFailure>
    }
    const body = raw.right
    if (
      typeof body === "object" &&
      body !== null &&
      "jobId" in body &&
      "examId" in body &&
      !("questions" in body)
    ) {
      const started = decodeEither(GenerateJobStartedSchema, body)
      if (Either.isLeft(started)) {
        return started as unknown as Either.Either<GenerateApiResult, ApiClientFailure>
      }
      return Either.right({
        kind: "async",
        examId: started.right.examId,
        jobId: started.right.jobId
      })
    }
    const exam = decodeEither(ExamWithQuestionsSchema, body)
    if (Either.isLeft(exam)) {
      return exam as unknown as Either.Either<GenerateApiResult, ApiClientFailure>
    }
    return Either.right({ kind: "sync", exam: exam.right })
  }
}
