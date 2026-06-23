import { type ExamSubject, type Grade, SUBJECT_LABEL, type SubjectCatalogItem } from "@teacher-exam/shared"
import { getManifestEntry, phaseForGrade } from "./readiness.js"

const GENERATE_GRADES = [5, 6] as const satisfies ReadonlyArray<Grade>

const GENERATE_SUBJECTS: ReadonlyArray<{
  key: ExamSubject
  family: string
  optional: boolean
}> = [
  { key: "bahasa_indonesia", family: "bahasa", optional: false },
  { key: "pendidikan_pancasila", family: "pancasila", optional: false },
  { key: "ipas", family: "ipas", optional: false },
  { key: "bahasa_inggris", family: "bahasa", optional: false },
  { key: "matematika", family: "matematika", optional: false }
]

export function listGenerateCurriculumCatalog(): ReadonlyArray<SubjectCatalogItem> {
  return GENERATE_SUBJECTS.map(({ family, key, optional }) => ({
    key,
    label: SUBJECT_LABEL[key],
    family,
    optional,
    grades: GENERATE_GRADES.map((grade) => ({
      grade,
      phase: phaseForGrade(grade),
      availability: getManifestEntry(key, grade)?.status ?? "missing"
    }))
  }))
}

export function isReadySibiPdfForGenerate(subject: ExamSubject, grade: number): boolean {
  const entry = getManifestEntry(subject, grade)
  return entry?.status === "ready" && entry.sourceType === "sibi_pdf"
}
