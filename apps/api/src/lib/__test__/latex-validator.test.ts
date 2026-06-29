import { describe, expect, test } from "vitest"
import { validateLatexText } from "../latex-validator.js"

describe("validateLatexText", () => {
  test("accepts valid inline LaTeX", () => {
    const result = validateLatexText("Soal $\\frac{3}{4}$ bagian")

    expect(result._tag).toBe("valid")
  })

  test("rejects unclosed inline delimiter", () => {
    const result = validateLatexText("Soal $\\frac{3}{4}")

    expect(result._tag).toBe("invalid")
  })

  test("accepts text without math delimiters", () => {
    const result = validateLatexText("Soal tanpa notasi matematika")

    expect(result._tag).toBe("valid")
  })

  test("rejects undelimited div command", () => {
    const result = validateLatexText("Hasil dari 1.824 \\div 12 adalah ....")

    expect(result._tag).toBe("invalid")
    if (result._tag === "invalid") {
      expect(result.reason).toContain("outside delimiters")
    }
  })

  test("accepts delimited div", () => {
    const result = validateLatexText("Hasil dari $1824 \\div 12$ adalah ....")

    expect(result._tag).toBe("valid")
  })

  test("rejects currency inside math delimiters", () => {
    const result = validateLatexText("Harga $Rp18.500$ per liter")

    expect(result._tag).toBe("invalid")
  })

  test("normalizes stray leading dollar before narrative", () => {
    const result = validateLatexText(
      "$Satu liter minyak goreng harganya Rp18.500. Bu Ratna membeli $\\frac{3}{4}$ liter."
    )

    expect(result._tag).toBe("valid")
  })

  test("rejects corrupted imes before repair", () => {
    const result = validateLatexText("Hasil dari $124 imes 36$ adalah ....")

    expect(result._tag).toBe("invalid")
    if (result._tag === "invalid") {
      expect(result.reason).toContain("imes")
    }
  })

  test("rejects bare rac{ outside delimiters", () => {
    const result = validateLatexText("rac{3}{5}")

    expect(result._tag).toBe("invalid")
    if (result._tag === "invalid") {
      expect(result.reason).toContain("rac{")
    }
  })
})
