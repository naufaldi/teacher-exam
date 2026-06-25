import { type ExamSubject, type Grade, SUBJECT_LABEL, type SubjectCatalogItem } from "@teacher-exam/shared"
import { existsSync } from "node:fs"
import { curriculumMdPath } from "../lib/curriculum.js"
import { CURRICULUM_MANIFEST } from "./manifest.js"
import { getManifestEntry, phaseForGrade } from "./readiness.js"

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

const GENERATE_SUBJECT_KEYS = new Set(GENERATE_SUBJECTS.map((subject) => subject.key))

const GENERATE_GRADES: ReadonlyArray<Grade> = Array.from(
  new Set(
    CURRICULUM_MANIFEST
      .filter((entry) => GENERATE_SUBJECT_KEYS.has(entry.subjectKey as ExamSubject))
      .map((entry) => entry.grade)
  )
).sort((a, b) => a - b)

export function listGenerateCurriculumCatalog(): ReadonlyArray<SubjectCatalogItem> {
  return GENERATE_SUBJECTS.map(({ family, key, optional }) => ({
    key,
    label: SUBJECT_LABEL[key],
    family,
    optional,
    grades: GENERATE_GRADES.map((grade) => ({
      grade,
      phase: phaseForGrade(grade),
      availability: availabilityForGenerate(key, grade)
    }))
  }))
}

export function isReadySibiPdfForGenerate(subject: ExamSubject, grade: number): boolean {
  const entry = getManifestEntry(subject, grade)
  return entry?.status === "ready" && entry.sourceType === "sibi_pdf" && existsSync(curriculumMdPath(subject, grade))
}

function availabilityForGenerate(
  subject: ExamSubject,
  grade: Grade
): SubjectCatalogItem["grades"][number]["availability"] {
  const entry = getManifestEntry(subject, grade)
  if (entry === undefined) return "missing"
  if (entry.status !== "ready") return entry.status
  return existsSync(curriculumMdPath(subject, grade)) ? "ready" : "missing"
}
