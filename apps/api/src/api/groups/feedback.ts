import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import { ExamPilotOutcomeSchema, SetExamPilotOutcomeInputSchema } from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const examIdParam = HttpApiSchema.param("examId", Schema.String)

export const FeedbackGroup = HttpApiGroup.make("feedback")
  .add(
    HttpApiEndpoint.put("setExamOutcome")`/feedback/exams/${examIdParam}/outcome`
      .setPayload(SetExamPilotOutcomeInputSchema)
      .addSuccess(ExamPilotOutcomeSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
