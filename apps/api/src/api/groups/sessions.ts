import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import {
  CreateSessionInputSchema,
  ExamSessionSchema,
  SessionDetailResponseSchema,
  SessionStudentSchema,
  StartSessionInputSchema,
  SubmitSessionInputSchema,
  SubmitSessionResponseSchema
} from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiBadRequest, ApiConflict, ApiDatabaseError, ApiExamNotFinal, ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { PublicBankIpRateLimit } from "../middleware/ip-rate-limit"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)
const codeParam = HttpApiSchema.param("code", Schema.String)

export const SessionsGroup = HttpApiGroup.make("sessions").add(
  HttpApiEndpoint.post("createSession")`/exams/${idParam}/sessions`
    .setPayload(CreateSessionInputSchema)
    .addSuccess(ExamSessionSchema, { status: 201 })
    .addError(ApiNotFound, { status: 404 })
    .addError(ApiExamNotFinal, { status: 400 })
    .addError(ApiDatabaseError, { status: 500 })
    .middleware(Authorization)
    .middleware(GlobalRateLimit)
)

export const PublicSessionsGroup = HttpApiGroup.make("publicSessions")
  .add(
    HttpApiEndpoint.get("getPublicSession")`/sessions/${codeParam}`
      .addSuccess(SessionDetailResponseSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("startSession")`/sessions/${codeParam}/start`
      .setPayload(StartSessionInputSchema)
      .addSuccess(SessionStudentSchema, { status: 201 })
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiBadRequest, { status: 400 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("submitSession")`/sessions/${codeParam}/submit`
      .setPayload(SubmitSessionInputSchema)
      .addSuccess(SubmitSessionResponseSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiConflict, { status: 409 })
      .addError(ApiBadRequest, { status: 400 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .middleware(PublicBankIpRateLimit)
