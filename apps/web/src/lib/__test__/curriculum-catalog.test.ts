import type { CurriculumCatalogResponse } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { formatSubjectGradeOptionLabel, readySubjectsForGrade, subjectOptionsForGrade } from "../curriculum-catalog.js"

const CATALOG: CurriculumCatalogResponse = [
  {
    key: "bahasa_indonesia",
    label: "Bahasa Indonesia",
    family: "bahasa",
    optional: false,
    grades: [
      { grade: 1, phase: "A", availability: "ready" },
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "ipas",
    label: "IPAS",
    family: "ipas",
    optional: false,
    grades: [
      { grade: 1, phase: "A", availability: "disabled" },
      { grade: 4, phase: "B", availability: "ready" }
    ]
  },
  {
    key: "bahasa_inggris",
    label: "Bahasa Inggris",
    family: "bahasa",
    optional: true,
    grades: [
      { grade: 1, phase: "A", availability: "missing" },
      { grade: 4, phase: "B", availability: "ready" }
    ]
  },
  {
    key: "matematika",
    label: "Matematika",
    family: "matematika",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "stubbed" },
      { grade: 6, phase: "C", availability: "stubbed" }
    ]
  }
]

describe("readySubjectsForGrade", () => {
  it("returns ready subjects for Kelas 1", () => {
    expect(readySubjectsForGrade(CATALOG, 1).map((subject) => subject.value)).toEqual([
      "bahasa_indonesia"
    ])
  })

  it("returns only ready subjects for the selected grade", () => {
    expect(readySubjectsForGrade(CATALOG, 5).map((subject) => subject.value)).toEqual([
      "bahasa_indonesia"
    ])
  })

  it("returns an empty list before grade is selected", () => {
    expect(readySubjectsForGrade(CATALOG, undefined)).toEqual([])
  })
})

describe("subjectOptionsForGrade", () => {
  it("returns all catalog subjects for the grade with availability metadata", () => {
    expect(
      subjectOptionsForGrade(CATALOG, 1).map((subject) => ({
        value: subject.value,
        availability: subject.availability,
        optional: subject.optional
      }))
    ).toEqual([
      { value: "bahasa_indonesia", availability: "ready", optional: false },
      { value: "ipas", availability: "disabled", optional: false },
      { value: "bahasa_inggris", availability: "missing", optional: true }
    ])
  })

  it("includes stubbed subjects for Kelas 5", () => {
    expect(subjectOptionsForGrade(CATALOG, 5).map((subject) => subject.value)).toEqual([
      "bahasa_indonesia",
      "matematika"
    ])
    expect(subjectOptionsForGrade(CATALOG, 5).find((subject) => subject.value === "matematika")?.availability).toBe(
      "stubbed"
    )
  })

  it("returns an empty list before grade is selected", () => {
    expect(subjectOptionsForGrade(CATALOG, undefined)).toEqual([])
  })
})

describe("formatSubjectGradeOptionLabel", () => {
  it("appends availability suffix for non-ready subjects", () => {
    const stubbed = subjectOptionsForGrade(CATALOG, 5).find((subject) => subject.value === "matematika")
    expect(stubbed).toBeDefined()
    if (stubbed === undefined) throw new Error("expected matematika option")
    expect(formatSubjectGradeOptionLabel(stubbed)).toBe("Matematika — Sedang dipersiapkan")
  })

  it("marks optional ready subjects", () => {
    const optional = subjectOptionsForGrade(CATALOG, 4).find((subject) => subject.value === "bahasa_inggris")
    expect(optional).toBeDefined()
    if (optional === undefined) throw new Error("expected bahasa inggris option")
    expect(formatSubjectGradeOptionLabel(optional)).toBe("Bahasa Inggris (Opsional)")
  })
})
