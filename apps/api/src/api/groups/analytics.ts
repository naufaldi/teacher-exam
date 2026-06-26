import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import { ClassAnalyticsResponseSchema, ExamAnalyticsResponseSchema } from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiDatabaseError, ApiForbidden, ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const examIdParam = HttpApiSchema.param("id", Schema.String)
const classIdParam = HttpApiSchema.param("id", Schema.String)

export const AnalyticsGroup = HttpApiGroup.make("analytics")
  .add(
    HttpApiEndpoint.get("getExamAnalytics")`/analytics/exams/${examIdParam}`
      .addSuccess(ExamAnalyticsResponseSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
  .add(
    HttpApiEndpoint.get("getClassAnalytics")`/analytics/classes/${classIdParam}`
      .addSuccess(ClassAnalyticsResponseSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiForbidden, { status: 403 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(Authorization)
      .middleware(GlobalRateLimit)
  )
