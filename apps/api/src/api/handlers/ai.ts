import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect, Match } from "effect"
import { generateExam } from "../../lib/ai-generate"
import { TeacherExamApi } from "../definition"
import { ApiAiGenerationError, ApiDatabaseError, ApiValidationError400, ApiValidationError422 } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { AiClient } from "../services/ai"

export const AiLive = HttpApiBuilder.group(
  TeacherExamApi,
  "ai",
  (handlers) =>
    handlers.handle("generateExam", ({ payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const aiService = yield* AiClient
        const result = yield* generateExam(userId, payload, aiService).pipe(
          Effect.catchTag(
            "AiGenerationError",
            (err) => Effect.succeed({ _tag: "ai_error" as const, message: String(err.cause) })
          ),
          Effect.catchTag(
            "ApiDatabaseError",
            (err) => Effect.succeed({ _tag: "database_error" as const, message: err.error })
          ),
          Effect.catchTag("CurriculumReadError", () =>
            Effect.succeed({
              _tag: "database_error" as const,
              message: "Curriculum lookup failed"
            }))
        )

        return yield* Match.value(result).pipe(
          Match.tag("validation_error", (validation) =>
            Effect.fail(
              new ApiValidationError400({
                error: "Validation failed",
                details: validation.details
              })
            )),
          Match.tag("insufficient_materi", (validation) =>
            Effect.fail(
              new ApiValidationError422({
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: validation.details
              })
            )),
          Match.tag("ai_error", (ai) =>
            Effect.fail(
              new ApiAiGenerationError({
                error: "AI generation failed",
                message: ai.message
              })
            )),
          Match.tag("database_error", (db) =>
            Effect.fail(
              new ApiDatabaseError({ error: db.message, code: "DATABASE_ERROR" })
            )),
          Match.tag("accepted", (accepted) => Effect.succeed(accepted.body as never)),
          Match.tag("success", (success) => Effect.succeed(success.body as never)),
          Match.exhaustive
        )
      }))
)
