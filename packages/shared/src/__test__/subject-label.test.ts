import { describe, expect, it } from "vitest"
import { resolveExamSubjectLabel } from "../subject-label.js"

describe("resolveExamSubjectLabel", () => {
  it("prefers custom subjectLabel over enum subject", () => {
    expect(
      resolveExamSubjectLabel({
        subject: "ipas",
        subjectLabel: "Seni Budaya"
      })
    ).toBe("Seni Budaya")
  })

  it("falls back to enum label when subjectLabel is absent", () => {
    expect(
      resolveExamSubjectLabel({
        subject: "ipas",
        subjectLabel: null
      })
    ).toBe("IPAS")
  })

  it("uses subjectLabel when subject is null", () => {
    expect(
      resolveExamSubjectLabel({
        subject: null,
        subjectLabel: "PJOK"
      })
    ).toBe("PJOK")
  })
})
