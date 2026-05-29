import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import { ExamSchema, ExamShareResponseSchema, ExamWithQuestionsSchema } from "@teacher-exam/shared"
import { Schema } from "effect"
import {
  ApiDatabaseError,
  ApiDiscussionExists,
  ApiExamNotFinal,
  ApiFinalizeNotAllowed,
  ApiInvalidJsonBodyWithCode,
  ApiNotFound,
  ApiValidationError422
} from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)

export const ExamsGroup = HttpApiGroup.make("exams")
  .add(
    HttpApiEndpoint.get("listExams", "/exams").addSuccess(Schema.Array(ExamSchema))
  )
  .add(
    HttpApiEndpoint.get("getExam")`/exams/${idParam}`
      .addSuccess(ExamWithQuestionsSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.patch("patchExam")`/exams/${idParam}`
      .setPayload(Schema.Unknown)
      .addSuccess(ExamWithQuestionsSchema)
      .addError(ApiInvalidJsonBodyWithCode, { status: 400 })
      .addError(ApiValidationError422, { status: 422 })
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.del("deleteExam")`/exams/${idParam}`
      .addSuccess(Schema.Void)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("duplicateExam")`/exams/${idParam}/duplicate`
      .addSuccess(ExamWithQuestionsSchema, { status: 201 })
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("shareExam")`/exams/${idParam}/share`
      .addSuccess(ExamShareResponseSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("validateCurriculum")`/exams/${idParam}/validate-curriculum`
      .addSuccess(ExamWithQuestionsSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("finalizeExam")`/exams/${idParam}/finalize`
      .addSuccess(ExamWithQuestionsSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiFinalizeNotAllowed, { status: 422 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("discussionExam")`/exams/${idParam}/discussion`
      .addSuccess(Schema.Unknown)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiExamNotFinal, { status: 400 })
      .addError(ApiDiscussionExists, { status: 409 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
