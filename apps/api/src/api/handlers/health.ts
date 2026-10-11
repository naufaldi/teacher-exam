import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { probeOpenAiGenerate } from "../../lib/effect-ai/provider-http"
import { TeacherExamApi } from "../definition"
import { ApiAiGenerationError } from "../errors/http"

export const HealthLive = HttpApiBuilder.group(
  TeacherExamApi,
  "health",
  (handlers) =>
    handlers
      .handle("getHealth", () =>
        Effect.succeed({
          status: "ok",
          service: "teacher-exam-api",
          timestamp: new Date().toISOString()
        }))
      .handle("getAiHealth", () =>
        Effect.gen(function*() {
          const result = yield* Effect.promise(() => probeOpenAiGenerate(process.env))
          if (!result.ok) {
            return yield* Effect.fail(
              new ApiAiGenerationError({
                error: "AI generation failed",
                message: result.message
              })
            )
          }
          return {
            status: "ok" as const,
            provider: "openai" as const,
            model: result.model
          }
        }))
)
