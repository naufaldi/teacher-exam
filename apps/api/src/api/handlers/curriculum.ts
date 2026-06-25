import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import type { ExamSubject, Grade } from "@teacher-exam/shared"
import { Effect } from "effect"
import { isReadySibiPdfForGenerate, listGenerateCurriculumCatalog } from "../../curriculum/catalog.js"
import { TeacherExamApi } from "../definition"
import { CurriculumService } from "../services/curriculum-service"

export const CurriculumLive = HttpApiBuilder.group(
  TeacherExamApi,
  "curriculum",
  (handlers) =>
    handlers
      .handle("getCurriculumCatalog", () => Effect.succeed([...listGenerateCurriculumCatalog()]))
      .handle("getCurriculumBabTopics", ({ urlParams }) =>
        Effect.gen(function*() {
          const subject = urlParams.subject as ExamSubject
          const grade = urlParams.grade as Grade
          if (!isReadySibiPdfForGenerate(subject, grade)) {
            return []
          }
          const curriculum = yield* CurriculumService
          const topics = yield* curriculum.listBabTopics(subject, grade).pipe(
            Effect.catchTag("CurriculumReadError", () => Effect.succeed([]))
          )
          return [...topics]
        }))
)
