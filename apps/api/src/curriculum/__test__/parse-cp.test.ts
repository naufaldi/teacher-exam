import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { parseCpTipsFromCorpusText, truncateForTips } from "../parse-cp.js"

const MD_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "md")
const MATEMATIKA_K5_SNIPPET = readFileSync(join(MD_DIR, "matematika-kelas-5.md"), "utf8").slice(0, 900)

describe("truncateForTips", () => {
  it("leaves short text unchanged", () => {
    expect(truncateForTips("pendek", 80)).toBe("pendek")
  })

  it("truncates long text with ellipsis", () => {
    const long = "a".repeat(120)
    const result = truncateForTips(long, 80)
    expect(result.length).toBeLessThanOrEqual(80)
    expect(result.endsWith("…")).toBe(true)
  })
})

describe("parseCpTipsFromCorpusText", () => {
  it("parses Matematika K5 corpus CP bullets with labels", () => {
    const tips = parseCpTipsFromCorpusText(MATEMATIKA_K5_SNIPPET)

    expect(tips.length).toBe(4)
    expect(tips[0]?.label).toMatch(/Menyimak/i)
    expect(tips[0]?.description.length).toBeGreaterThan(0)
    expect(tips[1]?.label).toMatch(/Membaca/i)
  })

  it("returns empty array when Capaian Pembelajaran section is missing", () => {
    expect(parseCpTipsFromCorpusText("# Title only\n\n## Bab 1: Foo")).toEqual([])
  })

  it("skips placeholder bullets with ellipsis-only descriptions", () => {
    const text = `# Test

## Capaian Pembelajaran
- Menyimak: ...
- Membaca: memahami teks singkat.
- Berbicara: menyampaikan gagasan.
- Menulis: menulis teks.

## Bab 1: Foo
`
    const tips = parseCpTipsFromCorpusText(text)
    expect(tips).toHaveLength(3)
    expect(tips.map((t) => t.label)).not.toContain("Menyimak.")
  })

  it("truncates long bullet descriptions for UI", () => {
    const longDesc = "x".repeat(200)
    const text = `# Test

## Capaian Pembelajaran
- Bilangan: ${longDesc}

## Bab 1
`
    const tips = parseCpTipsFromCorpusText(text)
    expect(tips[0]?.description.length).toBeLessThanOrEqual(100)
  })
})
