import type { ExamSubject } from "@teacher-exam/shared"
import { phaseForGrade } from "@teacher-exam/shared"
import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { curriculumMdFilename, curriculumMdPath } from "../../lib/curriculum.js"
import { CURRICULUM_MANIFEST } from "../manifest.js"
import { getManifestEntry, isGeneratable, listExtractableBooks } from "../readiness.js"

const EXPECTED_EXTRACTABLE_SLUGS = [
  "bahasa-indonesia-kelas-5",
  "bahasa-indonesia-kelas-6",
  "pendidikan-pancasila-kelas-5",
  "pendidikan-pancasila-kelas-6",
  "ipas-kelas-5",
  "ipas-kelas-6",
  "bahasa-inggris-kelas-5",
  "bahasa-inggris-kelas-6"
] as const

function manifestSlug(entry: { subjectKey: string; grade: number }): string {
  return curriculumMdFilename(entry.subjectKey as ExamSubject, entry.grade).replace(/\.md$/, "")
}

describe("CURRICULUM_MANIFEST", () => {
  it("has no duplicate (subjectKey, grade) pairs", () => {
    const keys = CURRICULUM_MANIFEST.map((entry) => `${entry.subjectKey}:${entry.grade}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("has committed md files for every ready entry", () => {
    const readyEntries = CURRICULUM_MANIFEST.filter((entry) => entry.status === "ready")
    for (const entry of readyEntries) {
      const path = curriculumMdPath(entry.subjectKey as ExamSubject, entry.grade)
      expect(existsSync(path), `missing md for ${entry.subjectKey} kelas ${entry.grade}`).toBe(true)
    }
  })

  it("marks ready and stubbed as generatable, missing and disabled as not", () => {
    expect(isGeneratable(getManifestEntry("bahasa_indonesia", 5)!.status)).toBe(true)
    expect(isGeneratable(getManifestEntry("matematika", 5)!.status)).toBe(true)
    expect(isGeneratable(getManifestEntry("bahasa_indonesia", 1)!.status)).toBe(false)
    expect(isGeneratable(getManifestEntry("ipas", 1)!.status)).toBe(false)
    expect(isGeneratable(getManifestEntry("muatan_lokal", 3)!.status)).toBe(false)
  })

  it("lists exactly eight extractable sibi_pdf books", () => {
    const extractable = listExtractableBooks()
    expect(extractable).toHaveLength(8)
    expect(extractable.map((entry) => manifestSlug(entry))).toEqual([...EXPECTED_EXTRACTABLE_SLUGS])
  })

  it("keeps phase aligned with grade for every entry", () => {
    for (const entry of CURRICULUM_MANIFEST) {
      expect(entry.phase).toBe(phaseForGrade(entry.grade))
    }
  })
})

// CurriculumService still falls back when md is missing — gated in #162.
