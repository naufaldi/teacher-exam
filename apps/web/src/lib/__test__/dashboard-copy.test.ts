import type { CurriculumCatalogResponse } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import {
  formatAcademicPeriod,
  firstReadySubjectGrade,
  generateCardDescription,
  heroCurriculumParagraph,
  readyGradeSpan,
  readySubjectMetas,
  resolveTipsContext
} from "../dashboard-copy.js"

const CATALOG: CurriculumCatalogResponse = [
  {
    key: "bahasa_indonesia",
    label: "Bahasa Indonesia",
    family: "bahasa",
    optional: false,
    grades: [
      { grade: 1, phase: "A", availability: "ready" },
      { grade: 5, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "matematika",
    label: "Matematika",
    family: "matematika",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "ipas",
    label: "IPAS",
    family: "ipas",
    optional: false,
    grades: [{ grade: 3, phase: "B", availability: "ready" }]
  }
]

describe("formatAcademicPeriod", () => {
  it("returns semester 2 for June", () => {
    expect(formatAcademicPeriod(new Date("2026-06-29"))).toBe("Tahun Pelajaran 2025/2026 · Semester 2")
  })

  it("returns semester 1 for October", () => {
    expect(formatAcademicPeriod(new Date("2026-10-15"))).toBe("Tahun Pelajaran 2026/2027 · Semester 1")
  })
})

describe("readySubjectMetas", () => {
  it("includes Matematika when catalog marks it ready", () => {
    const labels = readySubjectMetas(CATALOG).map((s) => s.label)
    expect(labels).toContain("Matematika")
    expect(labels).toContain("Bahasa Indonesia")
    expect(labels).toContain("IPAS")
  })
})

describe("readyGradeSpan", () => {
  it("spans min and max ready grades across catalog", () => {
    expect(readyGradeSpan(CATALOG)).toEqual({ min: 1, max: 6 })
  })
})

describe("heroCurriculumParagraph", () => {
  it("lists ready mapel dynamically", () => {
    const text = heroCurriculumParagraph(CATALOG)
    expect(text).toContain("Matematika")
    expect(text).toContain("Kelas 1–6")
    expect(text).not.toContain("Fase C")
  })
})

describe("generateCardDescription", () => {
  it("uses ready mapel count and grade span", () => {
    const text = generateCardDescription(CATALOG)
    expect(text).toContain("3 mapel")
    expect(text).toContain("Kelas 1–6")
  })
})

describe("resolveTipsContext", () => {
  it("prefers last exam subject and grade", () => {
    expect(
      resolveTipsContext(CATALOG, { subject: "matematika", grade: 5 })
    ).toEqual({ subject: "matematika", grade: 5 })
  })

  it("falls back to first ready combo when no exam", () => {
    expect(resolveTipsContext(CATALOG, null)).toEqual(firstReadySubjectGrade(CATALOG))
  })
})
