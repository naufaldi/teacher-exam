import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  babsToRewrite,
  diffBabManifest,
  hashBabContent,
  indexMarkdownBabs,
  manifestFromMarkdownFiles,
  readBabManifestDrift,
  selectChosenBabText
} from "../bab-index.js"

const SAMPLE = `## Bab 1: Bunyi
Kalimat unik satu.

## Bab 2: Main
Kalimat unik dua.
`

function sha256(bab: number, title: string, body: string): string {
  return createHash("sha256").update(`${bab}\n${title}\n${body}`).digest("hex")
}

describe("indexMarkdownBabs", () => {
  it("hashes each bab from its number, title, and body", () => {
    const indexed = indexMarkdownBabs(SAMPLE)

    expect(indexed.map((bab) => ({ bab: bab.bab, title: bab.title, contentHash: bab.contentHash }))).toEqual([
      { bab: 1, title: "Bunyi", contentHash: sha256(1, "Bunyi", "Kalimat unik satu.") },
      { bab: 2, title: "Main", contentHash: sha256(2, "Main", "Kalimat unik dua.") }
    ])
  })

  it("changes only the edited bab hash", () => {
    const before = indexMarkdownBabs(SAMPLE)
    const after = indexMarkdownBabs(SAMPLE.replace("Kalimat unik dua.", "Kalimat sudah diubah."))

    expect(after.find((bab) => bab.bab === 1)?.contentHash).toBe(before.find((bab) => bab.bab === 1)?.contentHash)
    expect(after.find((bab) => bab.bab === 2)?.contentHash).not.toBe(before.find((bab) => bab.bab === 2)?.contentHash)
    expect(hashBabContent(2, "Main", "Kalimat sudah diubah.")).toBe(after.find((bab) => bab.bab === 2)?.contentHash)
  })
})

describe("selectChosenBabText", () => {
  it("returns only the chosen bab", () => {
    const text = selectChosenBabText(SAMPLE, ["Bab 2: Main"])

    expect(text).toBe("## Bab 2: Main\nKalimat unik dua.")
    expect(text).not.toContain("Kalimat unik satu")
  })

  it("returns an empty string when the chosen bab is missing", () => {
    expect(selectChosenBabText(SAMPLE, ["Bab 9: Tidak ada"])).toBe("")
  })

  it("keeps the full markdown when no topic names a bab", () => {
    expect(selectChosenBabText(SAMPLE, ["Ekosistem"])).toBe(SAMPLE)
  })
})

describe("babsToRewrite", () => {
  it("rewrites only the bab whose stored hash differs", () => {
    const indexed = indexMarkdownBabs(SAMPLE)
    const bab1 = indexed.find((bab) => bab.bab === 1)
    const edited = SAMPLE.replace("Kalimat unik dua.", "Kalimat sudah diubah.")
    const rewrite = babsToRewrite(
      [
        { babNumber: "1", contentHash: bab1?.contentHash ?? "" },
        { babNumber: "2", contentHash: "stale-hash" }
      ],
      edited
    )

    expect(rewrite.map((bab) => bab.bab)).toEqual([2])
    expect(rewrite[0]?.body).toBe("Kalimat sudah diubah.")
  })
})

describe("diffBabManifest", () => {
  it("reports a stale committed hash for that bab", () => {
    const actual = manifestFromMarkdownFiles([{ file: "contoh.md", markdown: SAMPLE }])
    const committed = {
      version: 1 as const,
      books: [
        {
          file: "contoh.md",
          babs: actual.books[0]?.babs.map((bab) => bab.bab === 2 ? { ...bab, contentHash: "0".repeat(64) } : bab) ?? []
        }
      ]
    }

    expect(diffBabManifest(committed, actual)).toEqual([
      { file: "contoh.md", bab: 2, reason: "hash-mismatch" }
    ])
  })

  it("reports a bab removed from the markdown", () => {
    const committed = manifestFromMarkdownFiles([{ file: "contoh.md", markdown: SAMPLE }])
    const actual = manifestFromMarkdownFiles([{
      file: "contoh.md",
      markdown: "## Bab 1: Bunyi\nKalimat unik satu.\n"
    }])

    expect(diffBabManifest(committed, actual)).toEqual([
      { file: "contoh.md", bab: 2, reason: "missing-on-disk" }
    ])
  })

  it("matches the committed manifest to the curriculum markdown files", () => {
    expect(readBabManifestDrift()).toEqual([])
  })
})

describe("readBabManifestDrift temp files", () => {
  it("flags a markdown edit that the manifest does not name", () => {
    const root = mkdtempSync(join(tmpdir(), "bab-manifest-"))
    const mdDir = join(root, "md")
    mkdirSync(mdDir)
    writeFileSync(join(mdDir, "contoh.md"), SAMPLE)
    const manifest = manifestFromMarkdownFiles([{ file: "contoh.md", markdown: SAMPLE }])
    const stale = {
      ...manifest,
      books: manifest.books.map((book) => ({
        ...book,
        babs: book.babs.map((bab) => bab.bab === 1 ? { ...bab, contentHash: "abc" } : bab)
      }))
    }
    writeFileSync(join(root, "bab-manifest.json"), `${JSON.stringify(stale, null, 2)}\n`)

    expect(readBabManifestDrift(mdDir, join(root, "bab-manifest.json"))).toEqual([
      { file: "contoh.md", bab: 1, reason: "hash-mismatch" }
    ])
  })
})
