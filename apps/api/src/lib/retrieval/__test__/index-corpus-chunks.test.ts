import { describe, expect, it } from "vitest"
import { mkdtemp, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  buildCorpusChunkRows,
  listCurriculumMdTargets,
  parseCurriculumMdFilename
} from "../index-corpus-chunks.js"

describe("index-corpus-chunks", () => {
  it("parseCurriculumMdFilename maps slug files to subject and grade", () => {
    expect(parseCurriculumMdFilename("bahasa-indonesia-kelas-1.md")).toEqual({
      subject: "bahasa_indonesia",
      grade: 1
    })
    expect(parseCurriculumMdFilename("not-a-corpus.md")).toBeNull()
  })

  it("buildCorpusChunkRows chunks markdown by Bab headings", () => {
    const markdown = `# Title

## Bab 1: Satu
Alpha content long enough to chunk.

## Bab 2: Dua
Beta content long enough to chunk.
`
    const rows = buildCorpusChunkRows(markdown, "bahasa_indonesia", 1)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.docId === "corpus:bahasa_indonesia:1")).toBe(true)
    expect(rows.every((row) => row.source === "corpus")).toBe(true)
    expect(rows.some((row) => String(row.metadata["babHint"]).includes("Bab 1"))).toBe(true)
  })

  it("listCurriculumMdTargets discovers markdown files in a directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "corpus-md-"))
    await writeFile(join(dir, "bahasa-indonesia-kelas-1.md"), "# test")
    await writeFile(join(dir, "ignore.txt"), "nope")

    const targets = await listCurriculumMdTargets(dir)
    expect(targets).toEqual([
      {
        subject: "bahasa_indonesia",
        grade: 1,
        path: join(dir, "bahasa-indonesia-kelas-1.md")
      }
    ])
  })
})
