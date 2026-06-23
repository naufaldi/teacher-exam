import type { CurriculumSourceManifestItem, ExamSubject, Phase } from "@teacher-exam/shared"
import { curriculumMdFilename } from "../../src/lib/curriculum.js"

export interface ExtractionTarget {
  slug: string
  subjectKey: ExamSubject
  subject: string
  grade: number
  phase: Phase
  pdfFilename: string
}

function hasSourcePdf(entry: CurriculumSourceManifestItem): boolean {
  return entry.sourceType === "sibi_pdf" && entry.sourceFilename !== undefined
}

function toExtractionTarget(entry: CurriculumSourceManifestItem): ExtractionTarget {
  if (entry.sourceFilename === undefined) {
    throw new Error(`extractable manifest entry ${entry.subjectKey} kelas ${entry.grade} missing sourceFilename`)
  }
  return {
    grade: entry.grade,
    phase: entry.phase,
    pdfFilename: entry.sourceFilename,
    slug: curriculumMdFilename(entry.subjectKey as ExamSubject, entry.grade).replace(/\.md$/, ""),
    subject: entry.label,
    subjectKey: entry.subjectKey as ExamSubject
  }
}

export function listExtractionTargets(
  manifest: ReadonlyArray<CurriculumSourceManifestItem>
): ReadonlyArray<ExtractionTarget> {
  return manifest.filter((entry) => hasSourcePdf(entry) && entry.status === "ready").map(toExtractionTarget)
}

export function resolveExtractionTargets(input: {
  bookFilter: string | null
  manifest: ReadonlyArray<CurriculumSourceManifestItem>
}): ReadonlyArray<ExtractionTarget> {
  if (input.bookFilter === null) return listExtractionTargets(input.manifest)

  const matching = input.manifest.find((entry) =>
    curriculumMdFilename(entry.subjectKey as ExamSubject, entry.grade).replace(/\.md$/, "") === input.bookFilter
  )
  if (matching === undefined || !hasSourcePdf(matching)) return []
  return [toExtractionTarget(matching)]
}
