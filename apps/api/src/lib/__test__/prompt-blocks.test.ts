import { describe, expect, it } from "vitest"
import {
  authorityOrderBlock,
  completenessBlock,
  corpusBlock,
  formattingBlock,
  goalBlock,
  groundingBlock,
  joinPromptSections,
  outputBlock,
  personalityBlock,
  roleBlock,
  stopRulesBlock,
  structuredJsonOutputBlock,
  successCriteriaBlock,
  verificationBlock
} from "../prompt-blocks.js"

describe("prompt-blocks", () => {
  it("joinPromptSections flattens nested arrays and skips empty strings", () => {
    const result = joinPromptSections([
      roleBlock("Generator soal."),
      "",
      goalBlock("Hasilkan 5 soal.")
    ])
    expect(result).toContain("# Peran")
    expect(result).toContain("# Tujuan")
    expect(result).not.toMatch(/\n\n\n/)
  })

  it("roleBlock and goalBlock emit section headers", () => {
    expect(roleBlock("A")).toBe("# Peran\nA")
    expect(goalBlock("B")).toBe("# Tujuan\nB")
  })

  it("successCriteriaBlock renders bullet lines", () => {
    const block = successCriteriaBlock(["JSON valid", "tepat 3 elemen"])
    expect(block).toContain("# Kriteria keberhasilan")
    expect(block).toContain("- JSON valid")
    expect(block).toContain("- tepat 3 elemen")
  })

  it("groundingBlock warns against inventing CP/TP", () => {
    const block = groundingBlock()
    expect(block).toContain("# Grounding")
    expect(block).toMatch(/korpus/i)
    expect(block).toMatch(/Jangan mengarang/i)
  })

  it("corpusBlock wraps curriculum text with markers", () => {
    const block = corpusBlock("CP dummy")
    expect(block).toContain("--- KORPUS BUKU SISWA")
    expect(block).toContain("CP dummy")
    expect(block).toContain("--- AKHIR KORPUS ---")
  })

  it("authorityOrderBlock declares corpus over PDF", () => {
    const block = authorityOrderBlock()
    expect(block.toLowerCase()).toContain("authority order")
    expect(block).toMatch(/PDF guru.*konteks tambahan|konteks tambahan.*PDF guru/i)
    expect(block).toMatch(/baseline/i)
  })

  it("structuredJsonOutputBlock requires JSON-only output", () => {
    const block = structuredJsonOutputBlock()
    expect(block).toContain("# Kontrak output JSON")
    expect(block).toMatch(/HANYA.*JSON|JSON.*HANYA/i)
    expect(block).not.toContain("markdown fence")
  })

  it("completenessBlock references expected count", () => {
    const block = completenessBlock(20, "soal")
    expect(block).toContain("# Kelengkapan")
    expect(block).toContain("20")
    expect(block).toContain("soal")
  })

  it("verificationBlock is numbered and marked internal", () => {
    const block = verificationBlock(["Hitung elemen", "Cek _tag"])
    expect(block).toContain("# Verifikasi")
    expect(block).toContain("jangan tampilkan")
    expect(block).toContain("1. Hitung elemen")
    expect(block).toContain("2. Cek _tag")
  })

  it("stopRulesBlock lists stop conditions", () => {
    const block = stopRulesBlock(["Setelah JSON final, jangan tulis apa pun lagi"])
    expect(block).toContain("# Aturan berhenti")
    expect(block).toContain("Setelah JSON final")
  })

  it("personalityBlock and formattingBlock render sections", () => {
    expect(personalityBlock("Kakak sabar.")).toContain("# Personality")
    expect(formattingBlock(["Paragraf pendek"])).toContain("# Format")
  })

  it("outputBlock preserves indented schema lines", () => {
    const block = outputBlock(["  { \"_tag\": \"mcq_single\" }"])
    expect(block).toContain("# Output")
    expect(block).toContain("  { \"_tag\": \"mcq_single\" }")
  })
})
