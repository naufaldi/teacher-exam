import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiDatabaseError, ApiForbidden, ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { GradingService } from "../services/grading-service"

export const ResultsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "results",
  (handlers) =>
    handlers
      .handle("listResultsByExam", ({ path }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* GradingService
          return yield* service.listResultsByExam(userId, path.id)
        }).pipe(
          Effect.catchTags({
            ExamNotFoundError: (e) =>
              Effect.fail(
                new ApiForbidden({ error: "Forbidden", message: `Exam ${e.examId} not owned` })
              )
          })
        ))
      .handle("gradeSession", ({ path }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* GradingService
          return yield* service.gradeSession(userId, path.sessionId)
        }).pipe(
          Effect.catchTags({
            SessionNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Session ${e.sessionId} not found`, code: "NOT_FOUND" })),
            ExamNotFoundError: (e) =>
              Effect.fail(
                new ApiForbidden({ error: "Forbidden", message: `Exam ${e.examId} not owned` })
              ),
            GradingSaveError: (e) =>
              Effect.fail(
                new ApiDatabaseError({
                  error: `Grading save failed: ${String(e.cause)}`,
                  code: "DATABASE_ERROR"
                })
              )
          })
        ))
      .handle("listResults", ({ path }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* GradingService
          return yield* service.listResults(userId, path.sessionId)
        }).pipe(
          Effect.catchTags({
            SessionNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Session ${e.sessionId} not found`, code: "NOT_FOUND" })),
            ExamNotFoundError: (e) =>
              Effect.fail(
                new ApiForbidden({ error: "Forbidden", message: `Exam ${e.examId} not owned` })
              )
          })
        ))
      .handle("getResult", ({ path }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* GradingService
          return yield* service.getResult(userId, path.id)
        }).pipe(
          Effect.catchTags({
            ResultNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Result ${e.resultId} not found`, code: "NOT_FOUND" })),
            ExamNotFoundError: (e) =>
              Effect.fail(
                new ApiForbidden({ error: "Forbidden", message: `Exam ${e.examId} not owned` })
              )
          })
        ))
      .handle("gradeResult", ({ path, payload }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* GradingService
          return yield* service.gradeResult(userId, path.id, payload)
        }).pipe(
          Effect.catchTags({
            ResultNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Result ${e.resultId} not found`, code: "NOT_FOUND" })),
            ExamNotFoundError: (e) =>
              Effect.fail(
                new ApiForbidden({ error: "Forbidden", message: `Exam ${e.examId} not owned` })
              ),
            GradingSaveError: (e) =>
              Effect.fail(
                new ApiDatabaseError({
                  error: `Grading save failed: ${String(e.cause)}`,
                  code: "DATABASE_ERROR"
                })
              )
          })
        ))
)
