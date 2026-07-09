import { describe, expect, it } from "vitest"
import { shouldValidateLatexForGenerate } from "../should-validate-latex.js"

describe("shouldValidateLatexForGenerate", () => {
  it("validates default Matematika subject", () => {
    expect(
      shouldValidateLatexForGenerate({
        sourceMode: "default",
        subject: "matematika"
      })
    ).toBe(true)
  })

  it("validates pdf_guru when subjectLabel is Matematika (#233)", () => {
    expect(
      shouldValidateLatexForGenerate({
        sourceMode: "pdf_guru",
        subjectLabel: "matematika"
      })
    ).toBe(true)
  })

  it("does not validate pdf_guru for non-math labels", () => {
    expect(
      shouldValidateLatexForGenerate({
        sourceMode: "pdf_guru",
        subjectLabel: "IPAS"
      })
    ).toBe(false)
  })
})
