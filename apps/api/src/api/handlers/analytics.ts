import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiForbidden, ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { AnalyticsService } from "../services/analytics-service"

export const AnalyticsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "analytics",
  (handlers) =>
    handlers
      .handle("getExamAnalytics", ({ path }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* AnalyticsService
          return yield* service.getExamAnalytics(userId, path.id)
        }).pipe(
          Effect.catchTags({
            ExamNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Exam ${e.examId} not found`, code: "NOT_FOUND" })),
            ExamForbiddenError: (e) =>
              Effect.fail(new ApiForbidden({ error: "Forbidden", message: `Exam ${e.examId} not owned` }))
          })
        ))
      .handle("getClassAnalytics", ({ path }) =>
        Effect.gen(function*() {
          const { userId } = yield* CurrentUser
          const service = yield* AnalyticsService
          return yield* service.getClassAnalytics(userId, path.id)
        }).pipe(
          Effect.catchTags({
            ClassNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Class ${e.classId} not found`, code: "NOT_FOUND" })),
            ClassForbiddenError: (e) =>
              Effect.fail(new ApiForbidden({ error: "Forbidden", message: `Class ${e.classId} not owned` }))
          })
        ))
)
