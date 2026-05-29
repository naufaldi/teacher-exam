import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { ExamWithQuestionsSchema, GenerateExamInputSchema } from "@teacher-exam/shared"
import {
  ApiAiGenerationError,
  ApiDatabaseError,
  ApiInvalidJsonBody400,
  ApiUnauthorizedSimple,
  ApiValidationError400
} from "../errors/http"
import { Authorization } from "../middleware/auth"
import { AiGenerateRateLimit, GlobalRateLimit } from "../middleware/rate-limit"

export const AiGroup = HttpApiGroup.make("ai")
  .add(
    HttpApiEndpoint.post("generateExam", "/ai/generate")
      .setPayload(GenerateExamInputSchema)
      .addSuccess(ExamWithQuestionsSchema, { status: 201 })
      .addError(ApiUnauthorizedSimple, { status: 401 })
      .addError(ApiInvalidJsonBody400, { status: 400 })
      .addError(ApiValidationError400, { status: 400 })
      .addError(ApiAiGenerationError, { status: 502 })
      .addError(ApiDatabaseError, { status: 500 })
      .middleware(AiGenerateRateLimit)
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
