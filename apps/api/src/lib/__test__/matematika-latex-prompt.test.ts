import { describe, expect, test } from "vitest"
import { buildMatematikaLatexPromptRules } from "../matematika-latex-prompt.js"

describe("buildMatematikaLatexPromptRules", () => {
  test("includes ribuan and delimiter guidance", () => {
    const rules = buildMatematikaLatexPromptRules().join("\n")

    expect(rules).toContain("pemisah ribuan")
    expect(rules).toContain("tanpa delimiter")
    expect(rules).toContain("Jangan mulai field \"text\" dengan `$`")
    expect(rules).toContain("\\\\times")
    expect(rules).toContain("imes")
  })
})
