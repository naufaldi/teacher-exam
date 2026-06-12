import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  CURRICULUM_VERSION,
  CurriculumAvailabilitySchema,
  CurriculumSourceManifestItemSchema,
  phaseForGrade
} from "../curriculum.js"

describe("phaseForGrade", () => {
  it("maps Kelas 1–2 to Fase A", () => {
    expect(phaseForGrade(1)).toBe("A")
    expect(phaseForGrade(2)).toBe("A")
  })

  it("maps Kelas 3–4 to Fase B", () => {
    expect(phaseForGrade(3)).toBe("B")
    expect(phaseForGrade(4)).toBe("B")
  })

  it("maps Kelas 5–6 to Fase C", () => {
    expect(phaseForGrade(5)).toBe("C")
    expect(phaseForGrade(6)).toBe("C")
  })
})

describe("CurriculumAvailabilitySchema", () => {
  it("accepts valid status literals", () => {
    for (const status of ["ready", "stubbed", "missing", "disabled"] as const) {
      const decoded = Schema.decodeUnknownEither(CurriculumAvailabilitySchema)(status)
      expect(Either.isRight(decoded)).toBe(true)
    }
  })

  it("rejects invalid status strings", () => {
    const decoded = Schema.decodeUnknownEither(CurriculumAvailabilitySchema)("pending")
    expect(Either.isLeft(decoded)).toBe(true)
  })
})

describe("CurriculumSourceManifestItemSchema", () => {
  it("decodes a full RFC §10 manifest item", () => {
    const decoded = Schema.decodeUnknownEither(CurriculumSourceManifestItemSchema)({
      subjectKey: "bahasa_indonesia",
      label: "Bahasa Indonesia",
      grade: 5,
      phase: "C",
      curriculumVersion: CURRICULUM_VERSION,
      sourceType: "sibi_pdf",
      sourceFilename: "Indonesia_BS_KLS_V_Rev.pdf",
      status: "ready"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })
})
