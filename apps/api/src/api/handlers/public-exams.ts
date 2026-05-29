import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { fetchPublicExamWithQuestions } from "../../lib/exams-query"
import { TeacherExamApi } from "../definition"
import { ApiPublicExamNotFound } from "../errors/http"

export const PublicExamsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "publicExams",
  (handlers) =>
    handlers.handle("getPublicExam", ({ path }) =>
      Effect.gen(function*() {
        const exam = yield* fetchPublicExamWithQuestions(path.slug)
        if (!exam) {
          return yield* Effect.fail(
            new ApiPublicExamNotFound({ error: "Public exam not found", code: "NOT_FOUND" })
          )
        }
        return exam
      }))
)
