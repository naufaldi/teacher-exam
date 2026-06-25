import type { CurriculumCatalogResponse } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { readySubjectsForGrade } from "../curriculum-catalog.js"

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
