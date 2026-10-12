import { describe, expect, it } from "vitest"
import { formatMcqOption } from "../format-mcq-option.js"

describe("formatMcqOption", () => {
  it("keeps a single letter when the body already starts with that letter", () => {
    expect(formatMcqOption("a", "a. kalimat penjelas").line).toBe("a. kalimat penjelas")
  })

  it("keeps a single letter when the body repeats that letter", () => {
    expect(formatMcqOption("a", "a. a. kalimat penjelas").line).toBe("a. kalimat penjelas")
  })

  it("writes the letter once when the body has none", () => {
    expect(formatMcqOption("b", "gagasan utama").line).toBe("b. gagasan utama")
  })

  it("leaves a different letter inside the body", () => {
    expect(formatMcqOption("a", "b. gagasan utama").line).toBe("a. b. gagasan utama")
  })

  it("does not eat a word that merely starts with the letter", () => {
    expect(formatMcqOption("a", "apel merah").line).toBe("a. apel merah")
  })
})
