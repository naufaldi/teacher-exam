import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import {
  GradeResultInputSchema,
  GradeSessionResponseSchema,
  SessionResultSchema,
  SessionResultsResponseSchema
} from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiDatabaseError, ApiForbidden, ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const sessionIdParam = HttpApiSchema.param("sessionId", Schema.String)
const examIdParam = HttpApiSchema.param("id", Schema.String)
const resultIdParam = HttpApiSchema.param("id", Schema.String)

export const ResultsGroup = HttpApiGroup.make("results")
  .add(
    HttpApiEndpoint.get("listResultsByExam")`/exams/${examIdParam}/results`
      .addSuccess(SessionResultsResponseSchema)
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
  .add(
    HttpApiEndpoint.post("gradeSession")`/sessions/${sessionIdParam}/grade`
      .addSuccess(GradeSessionResponseSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
  .add(
    HttpApiEndpoint.get("listResults")`/sessions/${sessionIdParam}/results`
      .addSuccess(SessionResultsResponseSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
  .add(
    HttpApiEndpoint.get("getResult")`/results/${resultIdParam}`
      .addSuccess(SessionResultSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
  .add(
    HttpApiEndpoint.post("gradeResult")`/results/${resultIdParam}/grade`
      .setPayload(GradeResultInputSchema)
      .addSuccess(SessionResultSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
