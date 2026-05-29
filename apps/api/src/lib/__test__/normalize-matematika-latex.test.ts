import { describe, expect, test } from "vitest"
import { normalizeMatematikaLatexField } from "../normalize-matematika-latex.js"

describe("normalizeMatematikaLatexField", () => {
  test("removes stray leading dollar before narrative text", () => {
    const input = "$Satu liter minyak goreng harganya Rp18.500. Bu Ratna membeli $\\frac{3}{4}$ liter."
    expect(normalizeMatematikaLatexField(input)).toBe(
      "Satu liter minyak goreng harganya Rp18.500. Bu Ratna membeli $\\frac{3}{4}$ liter."
    )
  })

  test("leaves valid math-only strings unchanged", () => {
    expect(normalizeMatematikaLatexField("Hasil dari 5.678 + 3.421 adalah ....")).toBe(
      "Hasil dari 5.678 + 3.421 adalah ...."
    )
  })

  test("repairs corrupted imes inside math delimiters", () => {
    expect(normalizeMatematikaLatexField("Hasil dari $124 imes 36$ adalah ....")).toBe(
      "Hasil dari $124 \\times 36$ adalah ...."
    )
  })
})
