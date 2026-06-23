import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { listGenerateCurriculumCatalog } from "../../curriculum/catalog.js"
import { TeacherExamApi } from "../definition"

export const CurriculumLive = HttpApiBuilder.group(
  TeacherExamApi,
  "curriculum",
  (handlers) => handlers.handle("getCurriculumCatalog", () => Effect.succeed([...listGenerateCurriculumCatalog()]))
)
