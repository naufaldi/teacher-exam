import type { CurriculumSourceManifestItem } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { listExtractionTargets, resolveExtractionTargets } from "../lib/curriculum-extract-targets.js"

const baseEntry = {
  subjectKey: "matematika",
  label: "Matematika",
  grade: 2,
  phase: "A",
  curriculumVersion: "merdeka-2025",
  sourceType: "sibi_pdf",
  sourceFilename: "Matematika-BS-KLS-II.pdf",
  status: "missing"
} satisfies CurriculumSourceManifestItem

describe("curriculum extraction targets", () => {
  it("allows explicit extraction for a sourced PDF even before runtime readiness", () => {
    const targets = resolveExtractionTargets({
      bookFilter: "matematika-kelas-2",
      manifest: [baseEntry]
    })

    expect(targets).toEqual([
      {
        grade: 2,
        phase: "A",
        pdfFilename: "Matematika-BS-KLS-II.pdf",
        slug: "matematika-kelas-2",
        subject: "Matematika",
        subjectKey: "matematika"
      }
    ])
  })

  it("keeps unfiltered extraction limited to runtime-ready SIBI rows", () => {
    const readyEntry = {
      ...baseEntry,
      grade: 5,
      phase: "C",
      sourceFilename: "Matematika-BS-KLS-V.pdf",
      status: "ready"
    } satisfies CurriculumSourceManifestItem

    expect(listExtractionTargets([baseEntry, readyEntry]).map((target) => target.slug)).toEqual([
      "matematika-kelas-5"
    ])
  })
})
