import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { CurriculumCatalogResponseSchema } from "@teacher-exam/shared"
import { GlobalRateLimit } from "../middleware/rate-limit"

export const CurriculumGroup = HttpApiGroup.make("curriculum")
  .add(
    HttpApiEndpoint.get("getCurriculumCatalog", "/curriculum/catalog")
      .addSuccess(CurriculumCatalogResponseSchema)
  )
  .middleware(GlobalRateLimit)
