import type { ExamSubject } from "@teacher-exam/shared"
import { phaseForGrade } from "@teacher-exam/shared"
import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { curriculumMdFilename, curriculumMdPath } from "../../lib/curriculum.js"
import { CURRICULUM_MANIFEST } from "../manifest.js"
import { getManifestEntry, isGeneratable, listExtractableBooks } from "../readiness.js"

const EXPECTED_EXTRACTABLE_SLUGS = [
  "bahasa-indonesia-kelas-1",
  "bahasa-indonesia-kelas-2",
  "bahasa-indonesia-kelas-3",
  "bahasa-indonesia-kelas-5",
  "bahasa-indonesia-kelas-6",
  "pendidikan-pancasila-kelas-1",
  "pendidikan-pancasila-kelas-2",
  "pendidikan-pancasila-kelas-4",
  "pendidikan-pancasila-kelas-5",
  "pendidikan-pancasila-kelas-6",
  "ipas-kelas-3",
  "ipas-kelas-4",
  "ipas-kelas-5",
  "ipas-kelas-6",
  "bahasa-inggris-kelas-3",
  "bahasa-inggris-kelas-4",
  "bahasa-inggris-kelas-5",
  "bahasa-inggris-kelas-6",
  "matematika-kelas-1",
  "matematika-kelas-2",
  "matematika-kelas-3",
  "matematika-kelas-4",
  "matematika-kelas-5",
  "matematika-kelas-6"
] as const

const EXPECTED_CURRENT_SOURCE_FILENAMES = new Map<string, string>([
  ["bahasa-indonesia-kelas-1", "Bahasa_Indonesia_BS_KLS_I_Rev.pdf"],
  ["bahasa-indonesia-kelas-2", "Indonesia_BS_KLS_II_Rev.pdf"],
  ["bahasa-indonesia-kelas-3", "Indonesia_BS_KLS_III_Rev+.pdf"],
  ["bahasa-indonesia-kelas-5", "Indonesia_BS_KLS_V_Rev.pdf"],
  ["bahasa-indonesia-kelas-6", "Indonesia_BS_KLS_VI_Rev.pdf"],
  ["pendidikan-pancasila-kelas-1", "Pendidikan-Pancasila-BS-KLS-I.pdf"],
  ["pendidikan-pancasila-kelas-2", "Pendidikan-Pancasila-BS-KLS-II.pdf"],
  ["pendidikan-pancasila-kelas-3", "Pendidikan-Pancasila-BS-KLS-III.pdf"],
  ["pendidikan-pancasila-kelas-4", "Pendidikan-Pancasila-BS-KLS-IV.pdf"],
  ["pendidikan-pancasila-kelas-5", "Pendidikan-Pancasila-BS-KLS-V.pdf"],
  ["pendidikan-pancasila-kelas-6", "Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf"],
  ["ipas-kelas-3", "IPAS_BS_KLS_III.pdf"],
  ["ipas-kelas-4", "IPAS_BS_KLS_IV_Rev.pdf"],
  ["ipas-kelas-5", "IPAS_BS_KLS_V_Rev.pdf"],
  ["ipas-kelas-6", "IPAS_BS_KLS_VI_Rev.pdf"],
  ["bahasa-inggris-kelas-3", "Inggris_FN_BS_KLS_III.pdf"],
  ["bahasa-inggris-kelas-4", "Inggris_FN_BS_KLS_IV.pdf"],
  ["bahasa-inggris-kelas-5", "Inggris_FN_BS_KLS_V.pdf"],
  ["bahasa-inggris-kelas-6", "Inggris_FN_BS_KLS_VI.pdf"],
  ["matematika-kelas-1", "Matematika-BS-KLS-I.pdf"],
  ["matematika-kelas-2", "Matematika-BS-KLS-II.pdf"],
  ["matematika-kelas-3", "Matematika_BS_KLS_III.pdf"],
  ["matematika-kelas-4", "Matematika-BS-KLS-IV.pdf"],
  ["matematika-kelas-5", "Matematika-BS-KLS-V.pdf"],
  ["matematika-kelas-6", "Matematika_BS_KLS_VI.pdf"]
])

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
    expect(isGeneratable(getManifestEntry("bahasa_indonesia", 4)!.status)).toBe(false)
    expect(isGeneratable(getManifestEntry("ipas", 1)!.status)).toBe(false)
    expect(isGeneratable(getManifestEntry("muatan_lokal", 3)!.status)).toBe(false)
  })

  it("lists exactly the quality-passing extractable sibi_pdf books", () => {
    const extractable = listExtractableBooks()
    expect(extractable).toHaveLength(EXPECTED_EXTRACTABLE_SLUGS.length)
    expect(extractable.map((entry) => manifestSlug(entry))).toEqual([...EXPECTED_EXTRACTABLE_SLUGS])
  })

  it("maps downloaded current-subject PDFs without changing readiness gates", () => {
    for (const entry of CURRICULUM_MANIFEST) {
      const slug = manifestSlug(entry)
      const expectedFilename = EXPECTED_CURRENT_SOURCE_FILENAMES.get(slug)
      if (expectedFilename !== undefined) {
        expect(entry.sourceType, slug).toBe("sibi_pdf")
        expect(entry.sourceFilename, slug).toBe(expectedFilename)
      }
    }

    expect(getManifestEntry("bahasa_indonesia", 4)?.sourceFilename).toBeUndefined()
    expect(getManifestEntry("bahasa_inggris", 1)?.sourceFilename).toBeUndefined()
    expect(getManifestEntry("bahasa_inggris", 2)?.sourceFilename).toBeUndefined()
    expect(getManifestEntry("ipas", 1)?.sourceFilename).toBeUndefined()
    expect(getManifestEntry("ipas", 2)?.sourceFilename).toBeUndefined()
    expect(getManifestEntry("pendidikan_pancasila", 3)?.status).toBe("missing")
    expect(getManifestEntry("matematika", 5)?.status).toBe("ready")
    expect(getManifestEntry("matematika", 6)?.status).toBe("ready")
  })

  it("keeps phase aligned with grade for every entry", () => {
    for (const entry of CURRICULUM_MANIFEST) {
      expect(entry.phase).toBe(phaseForGrade(entry.grade))
    }
  })
})

// CurriculumService still falls back when md is missing — gated in #162.
