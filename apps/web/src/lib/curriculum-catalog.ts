import type { CurriculumCatalogResponse, ExamSubject } from "@teacher-exam/shared"
import { SUBJECT_OPTIONS, type SubjectMeta } from "./subjects.js"

type GenerateGrade = 5 | 6

export function readySubjectsForGrade(
  catalog: CurriculumCatalogResponse,
  grade: GenerateGrade | undefined
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
