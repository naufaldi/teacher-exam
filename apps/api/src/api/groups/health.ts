import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { Schema } from "effect"

export const HealthResponseSchema = Schema.Struct({
  status: Schema.String,
  service: Schema.String,
  timestamp: Schema.String
})

export const HealthGroup = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("getHealth", "/health").addSuccess(HealthResponseSchema)
)
