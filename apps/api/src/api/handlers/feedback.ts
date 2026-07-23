import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { FeedbackService } from "../services/feedback-service"

export const FeedbackLive = HttpApiBuilder.group(
  TeacherExamApi,
  "feedback",
  (handlers) =>
    handlers.handle("setExamOutcome", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* FeedbackService
        return yield* service.setExamOutcome(userId, path.examId, payload)
      }).pipe(
        Effect.catchTag("FeedbackExamNotFoundError", (error) =>
          Effect.fail(
            new ApiNotFound({
              error: `Exam ${error.examId} not found`,
              code: "NOT_FOUND"
            })
          ))
      ))
)
