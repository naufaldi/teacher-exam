import type { CurriculumAvailability, CurriculumCatalogResponse, ExamSubject, Grade } from "@teacher-exam/shared"
import { SUBJECT_OPTIONS, type SubjectMeta } from "./subjects.js"

export type SubjectGradeOption = SubjectMeta & {
  availability: CurriculumAvailability
  optional: boolean
}

const SUBJECT_ORDER = new Map(SUBJECT_OPTIONS.map((subject, index) => [subject.value, index]))

const AVAILABILITY_SUFFIX: Record<Exclude<CurriculumAvailability, "ready">, string> = {
  stubbed: "Sedang dipersiapkan",
  missing: "Belum tersedia",
  disabled: "Tidak tersedia"
}

export function formatSubjectGradeOptionLabel(option: SubjectGradeOption): string {
  const optionalSuffix = option.optional ? " (Opsional)" : ""
  if (option.availability === "ready") {
    return `${option.label}${optionalSuffix}`
  }
  return `${option.label} — ${AVAILABILITY_SUFFIX[option.availability]}${optionalSuffix}`
}

export function subjectOptionsForGrade(
  catalog: CurriculumCatalogResponse,
  grade: Grade | undefined
): ReadonlyArray<SubjectGradeOption> {
  if (grade === undefined) return []

  const subjectMetaByValue = new Map(SUBJECT_OPTIONS.map((subject) => [subject.value, subject]))

  const options = catalog.flatMap((item) => {
    const gradeStatus = item.grades.find((entry) => entry.grade === grade)
    if (gradeStatus === undefined) return []

    const meta = subjectMetaByValue.get(item.key as ExamSubject)
    if (meta === undefined) return []

    return [{
      ...meta,
      availability: gradeStatus.availability,
      optional: item.optional
    }]
  })

  return [...options].sort((left, right) => {
    const leftOrder = SUBJECT_ORDER.get(left.value) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = SUBJECT_ORDER.get(right.value) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

export function readySubjectsForGrade(
  catalog: CurriculumCatalogResponse,
  grade: Grade | undefined
): ReadonlyArray<SubjectMeta> {
  return subjectOptionsForGrade(catalog, grade).filter((subject) => subject.availability === "ready")
}
