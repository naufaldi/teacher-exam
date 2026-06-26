import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import {
  CreateTemplateInputSchema,
  ExamTemplateSchema,
  TemplateApplyResponseSchema,
  UpdateTemplateInputSchema
} from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)

export const TemplatesGroup = HttpApiGroup.make("templates")
  .add(
    HttpApiEndpoint.get("listTemplates", "/templates")
      .addSuccess(Schema.Array(ExamTemplateSchema))
  )
  .add(
    HttpApiEndpoint.post("createTemplate", "/templates")
      .setPayload(CreateTemplateInputSchema)
      .addSuccess(ExamTemplateSchema, { status: 201 })
  )
  .add(
    HttpApiEndpoint.patch("updateTemplate")`/templates/${idParam}`
      .setPayload(UpdateTemplateInputSchema)
      .addSuccess(ExamTemplateSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.del("deleteTemplate")`/templates/${idParam}`
      .addSuccess(Schema.Void)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("applyTemplate")`/templates/${idParam}/apply`
      .addSuccess(TemplateApplyResponseSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
