import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { Schema } from "effect"
import { ApiForbidden } from "../errors/http"

export const DevAuthGroup = HttpApiGroup.make("devAuth")
  .add(
    HttpApiEndpoint.post("devLogin", "/dev/login")
      .addSuccess(Schema.Unknown)
      .addError(ApiForbidden, { status: 403 })
  )
