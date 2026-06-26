import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import { ExportUrlParamsSchema } from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiBadRequest, ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)
const slugParam = HttpApiSchema.param("slug", Schema.String)

export const ExportsGroup = HttpApiGroup.make("exports").add(
  HttpApiEndpoint.get("exportExam")`/exams/${idParam}/export`
    .setUrlParams(ExportUrlParamsSchema)
    .addSuccess(Schema.Unknown)
    .addError(ApiNotFound, { status: 404 })
    .addError(ApiBadRequest, { status: 400 })
    .middleware(Authorization)
    .middleware(GlobalRateLimit)
)

export const PublicExportsGroup = HttpApiGroup.make("publicExports").add(
  HttpApiEndpoint.get("exportPublicExam")`/public/exams/${slugParam}/export`
    .setUrlParams(ExportUrlParamsSchema)
    .addSuccess(Schema.Unknown)
    .addError(ApiNotFound, { status: 404 })
    .addError(ApiBadRequest, { status: 400 })
)
