import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { Schema } from "effect"
import { ApiAiGenerationError } from "../errors/http"

export const HealthResponseSchema = Schema.Struct({
  status: Schema.String,
  service: Schema.String,
  timestamp: Schema.String
})

export const AiHealthResponseSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  provider: Schema.Literal("openai"),
  model: Schema.String
})

export const HealthGroup = HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("getHealth", "/health").addSuccess(HealthResponseSchema))
  .add(
    HttpApiEndpoint.get("getAiHealth", "/health/ai")
      .addSuccess(AiHealthResponseSchema)
      .addError(ApiAiGenerationError)
  )
