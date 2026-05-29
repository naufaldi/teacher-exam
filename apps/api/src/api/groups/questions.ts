import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import { QuestionSchema, RegenerateQuestionInputSchema } from "@teacher-exam/shared"
import { Schema } from "effect"
import {
  ApiAiError,
  ApiDatabaseError,
  ApiInvalidJsonBodyWithCode,
  ApiNotFound,
  ApiValidationError422,
  ApiValidationError422NoDetails
} from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)

export const QuestionsGroup = HttpApiGroup.make("questions")
  .add(
    HttpApiEndpoint.patch("patchQuestion")`/questions/${idParam}`
      .setPayload(Schema.Unknown)
      .addSuccess(QuestionSchema)
      .addError(ApiInvalidJsonBodyWithCode, { status: 400 })
      .addError(ApiValidationError422, { status: 422 })
      .addError(ApiValidationError422NoDetails, { status: 422 })
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("regenerateQuestion")`/questions/${idParam}/regenerate`
      .setPayload(RegenerateQuestionInputSchema)
      .addSuccess(QuestionSchema)
      .addError(ApiInvalidJsonBodyWithCode, { status: 400 })
      .addError(ApiValidationError422, { status: 422 })
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiAiError, { status: 502 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
