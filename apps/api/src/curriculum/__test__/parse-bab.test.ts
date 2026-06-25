import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { listBabTopicsFromMarkdown, parseBabBlocks } from "../parse-bab.js"

const PPKN_K1_MD = readFileSync(
  fileURLToPath(new URL("../md/pendidikan-pancasila-kelas-1.md", import.meta.url)),
  "utf8"
)

describe("parseBabBlocks", () => {
  it("extracts Bab number and title from markdown headers", () => {
    const sample = `# Pendidikan Pancasila — Kelas 1

## Capaian Pembelajaran
- ...

## Bab 1: Aku dan Teman-Temanku
**Topik utama:** mengenal diri

## Bab 2: Aku Patuh pada Aturan
**Topik utama:** aturan
`

    const blocks = parseBabBlocks(sample)

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toEqual(
      expect.objectContaining({ num: 1, title: "Aku dan Teman-Temanku" })
    )
    expect(blocks[1]).toEqual(
      expect.objectContaining({ num: 2, title: "Aku Patuh pada Aturan" })
    )
  })
})

describe("listBabTopicsFromMarkdown", () => {
  it("returns ordered Bab labels from PPKN Kelas 1 corpus", () => {
    const topics = listBabTopicsFromMarkdown(PPKN_K1_MD)

    expect(topics).toHaveLength(4)
    expect(topics[0]).toEqual({
      bab: 1,
      title: "Aku dan Teman-Temanku",
      label: "Bab 1: Aku dan Teman-Temanku"
    })
    expect(topics[3]?.label).toBe("Bab 4: Aku dan Lingkunganku")
  })

  it("returns empty array when no Bab headers exist", () => {
    expect(listBabTopicsFromMarkdown("# Stub\n\nNo bab here.")).toEqual([])
  })
})
