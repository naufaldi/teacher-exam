import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import { Schema } from "effect"

export class ApiUnauthorizedSimple extends Schema.TaggedError<ApiUnauthorizedSimple>()(
  "ApiUnauthorizedSimple",
  { error: Schema.Literal("Unauthorized") },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class ApiUnauthorizedWithCode extends Schema.TaggedError<ApiUnauthorizedWithCode>()(
  "ApiUnauthorizedWithCode",
  {
    error: Schema.Literal("Unauthorized"),
    code: Schema.Literal("UNAUTHORIZED")
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class ApiNotFound extends Schema.TaggedError<ApiNotFound>()(
  "ApiNotFound",
  {
    error: Schema.String,
    code: Schema.Literal("NOT_FOUND")
  },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class ApiBadRequest extends Schema.TaggedError<ApiBadRequest>()(
  "ApiBadRequest",
  {
    error: Schema.String,
    code: Schema.Literal("BAD_REQUEST")
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class ApiValidationError422 extends Schema.TaggedError<ApiValidationError422>()(
  "ApiValidationError422",
  {
    error: Schema.Literal("Validation failed"),
    code: Schema.Literal("VALIDATION_ERROR"),
    details: Schema.String
  },
  HttpApiSchema.annotations({ status: 422 })
) {}

export class ApiValidationError400 extends Schema.TaggedError<ApiValidationError400>()(
  "ApiValidationError400",
  {
    error: Schema.Literal("Validation failed"),
    details: Schema.String
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class ApiForbidden extends Schema.TaggedError<ApiForbidden>()(
  "ApiForbidden",
  {
    error: Schema.Literal("Forbidden"),
    message: Schema.String
  },
  HttpApiSchema.annotations({ status: 403 })
) {}

export class ApiRateLimited extends Schema.TaggedError<ApiRateLimited>()(
  "ApiRateLimited",
  {
    error: Schema.Literal("Terlalu banyak permintaan. Silakan coba lagi sebentar."),
    code: Schema.Literal("RATE_LIMITED"),
    retryAfterSec: Schema.Number
  },
  HttpApiSchema.annotations({ status: 429 })
) {}

export class ApiConflict extends Schema.TaggedError<ApiConflict>()(
  "ApiConflict",
  {
    error: Schema.String
  },
  HttpApiSchema.annotations({ status: 409 })
) {}

export class ApiDatabaseError extends Schema.TaggedError<ApiDatabaseError>()(
  "ApiDatabaseError",
  {
    error: Schema.String,
    code: Schema.Literal("DATABASE_ERROR")
  },
  HttpApiSchema.annotations({ status: 500 })
) {}

export class ApiAiError extends Schema.TaggedError<ApiAiError>()(
  "ApiAiError",
  {
    error: Schema.String,
    code: Schema.Literal("AI_ERROR")
  },
  HttpApiSchema.annotations({ status: 502 })
) {}

export class ApiAiGenerationError extends Schema.TaggedError<ApiAiGenerationError>()(
  "ApiAiGenerationError",
  {
    error: Schema.Literal("AI generation failed"),
    message: Schema.optional(Schema.String)
  },
  HttpApiSchema.annotations({ status: 502 })
) {}

export class ApiFinalizeNotAllowed extends Schema.TaggedError<ApiFinalizeNotAllowed>()(
  "ApiFinalizeNotAllowed",
  {
    error: Schema.String,
    code: Schema.Literal("FINALIZE_NOT_ALLOWED"),
    details: Schema.Struct({
      pendingCount: Schema.Number,
      rejectedCount: Schema.Number
    })
  },
  HttpApiSchema.annotations({ status: 422 })
) {}

export class ApiExamNotFinal extends Schema.TaggedError<ApiExamNotFinal>()(
  "ApiExamNotFinal",
  {
    error: Schema.String,
    code: Schema.Literal("EXAM_NOT_FINAL")
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class ApiDiscussionExists extends Schema.TaggedError<ApiDiscussionExists>()(
  "ApiDiscussionExists",
  {
    error: Schema.String,
    code: Schema.Literal("DISCUSSION_ALREADY_EXISTS")
  },
  HttpApiSchema.annotations({ status: 409 })
) {}

export class ApiUserNotFound extends Schema.TaggedError<ApiUserNotFound>()(
  "ApiUserNotFound",
  {
    error: Schema.Literal("User not found")
  },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class ApiPublicExamNotFound extends Schema.TaggedError<ApiPublicExamNotFound>()(
  "ApiPublicExamNotFound",
  {
    error: Schema.Literal("Public exam not found"),
    code: Schema.Literal("NOT_FOUND")
  },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class ApiInvalidJsonBody400 extends Schema.TaggedError<ApiInvalidJsonBody400>()(
  "ApiInvalidJsonBody400",
  { error: Schema.Literal("Invalid JSON body") },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class ApiInvalidJsonBodyWithCode extends Schema.TaggedError<ApiInvalidJsonBodyWithCode>()(
  "ApiInvalidJsonBodyWithCode",
  {
    error: Schema.Literal("Invalid JSON body"),
    code: Schema.Literal("BAD_REQUEST")
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class ApiValidationError422NoDetails extends Schema.TaggedError<ApiValidationError422NoDetails>()(
  "ApiValidationError422NoDetails",
  {
    error: Schema.String,
    code: Schema.Literal("VALIDATION_ERROR")
  },
  HttpApiSchema.annotations({ status: 422 })
) {}
