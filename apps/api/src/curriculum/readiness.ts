import type { CurriculumAvailability, CurriculumSourceManifestItem } from "@teacher-exam/shared"
import { phaseForGrade } from "@teacher-exam/shared"
import { CURRICULUM_MANIFEST } from "./manifest.js"

export { phaseForGrade }

export function getManifestEntry(
  subjectKey: string,
  grade: number
): CurriculumSourceManifestItem | undefined {
  return CURRICULUM_MANIFEST.find((entry) => entry.subjectKey === subjectKey && entry.grade === grade)
}

export function isGeneratable(status: CurriculumAvailability): boolean {
  return status === "ready"
}

export function listExtractableBooks(): ReadonlyArray<CurriculumSourceManifestItem> {
  return CURRICULUM_MANIFEST.filter(
    (entry) => entry.sourceType === "sibi_pdf" && entry.status === "ready"
  )
}
