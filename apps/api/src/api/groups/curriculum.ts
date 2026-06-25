import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import {
  CurriculumBabTopicsResponseSchema,
  CurriculumBabTopicsUrlParamsSchema,
  CurriculumCatalogResponseSchema
} from "@teacher-exam/shared"
import { GlobalRateLimit } from "../middleware/rate-limit"

export const CurriculumGroup = HttpApiGroup.make("curriculum")
  .add(
    HttpApiEndpoint.get("getCurriculumCatalog", "/curriculum/catalog")
      .addSuccess(CurriculumCatalogResponseSchema)
  )
  .add(
    HttpApiEndpoint.get("getCurriculumBabTopics", "/curriculum/bab-topics")
      .setUrlParams(CurriculumBabTopicsUrlParamsSchema)
      .addSuccess(CurriculumBabTopicsResponseSchema)
  )
  .middleware(GlobalRateLimit)
