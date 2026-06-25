import type { CurriculumCatalogResponse, ExamSubject, Grade } from "@teacher-exam/shared"
import { SUBJECT_OPTIONS, type SubjectMeta } from "./subjects.js"

export function readySubjectsForGrade(
  catalog: CurriculumCatalogResponse,
  grade: Grade | undefined
): ReadonlyArray<SubjectMeta> {
  if (grade === undefined) return []

  const readyKeys = new Set(
    catalog.flatMap((item) => {
      const gradeStatus = item.grades.find((entry) => entry.grade === grade)
      return gradeStatus?.availability === "ready" ? [item.key as ExamSubject] : []
    })
  )

  return SUBJECT_OPTIONS.filter((subject) => readyKeys.has(subject.value))
}
