import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { Schema } from "effect"
import { ApiAiGenerationError, ApiForbidden } from "../errors/http"

export const HealthResponseSchema = Schema.Struct({
  status: Schema.String,
  service: Schema.String,
  timestamp: Schema.String
})

export const AiConfigHealthResponseSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  provider: Schema.Literal("openai", "anthropic", "minimax"),
  model: Schema.String,
  keyConfigured: Schema.Boolean
})

export const AiHealthResponseSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  provider: Schema.Literal("openai"),
  model: Schema.String
})

export const HealthGroup = HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("getHealth", "/health").addSuccess(HealthResponseSchema))
  .add(HttpApiEndpoint.get("getAiHealth", "/health/ai").addSuccess(AiConfigHealthResponseSchema))
  .add(
    HttpApiEndpoint.get("getAiLiveHealth", "/health/ai-live")
      .addSuccess(AiHealthResponseSchema)
      .addError(ApiForbidden)
      .addError(ApiAiGenerationError)
  )
