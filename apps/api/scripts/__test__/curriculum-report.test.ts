import type { CurriculumSourceManifestItem } from "@teacher-exam/shared"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { collectCurriculumList, collectCurriculumStats } from "../lib/curriculum-report.js"

const tempRoots: Array<string> = []

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "teacher-exam-curriculum-"))
  tempRoots.push(root)
  return root
}

function manifestItem(
  overrides: Partial<CurriculumSourceManifestItem> = {}
): CurriculumSourceManifestItem {
  return {
    subjectKey: "bahasa_indonesia",
    label: "Bahasa Indonesia",
    grade: 5,
    phase: "C",
    curriculumVersion: "merdeka-2025",
    sourceType: "sibi_pdf",
    sourceFilename: "Indonesia_BS_KLS_V_Rev.pdf",
    status: "ready",
    ...overrides
  }
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe("curriculum report helpers", () => {
  it("reports PDF readiness from the configured pdf directory only", async () => {
    const root = makeTempRoot()
    const pdfDir = join(root, "pdf")
    const mdDir = join(root, "md")
    await mkdir(pdfDir, { recursive: true })
    await mkdir(mdDir, { recursive: true })
    writeFileSync(join(root, "Indonesia_BS_KLS_V_Rev.pdf"), "%PDF in wrong folder")
    writeFileSync(join(mdDir, "bahasa-indonesia-kelas-5.md"), "# Bahasa Indonesia\n")

    const [row] = collectCurriculumList({
      manifest: [manifestItem()],
      pdfDir,
      mdDir
    })

    expect(row).toMatchObject({
      slug: "bahasa-indonesia-kelas-5",
      pdfExists: false,
      mdExists: true,
      extractable: true,
      readiness: "missing_pdf"
    })
    expect(row?.pdfPath).toBe(join(pdfDir, "Indonesia_BS_KLS_V_Rev.pdf"))
  })

  it("counts markdown corpus sections for stats output", async () => {
    const root = makeTempRoot()
    const pdfDir = join(root, "pdf")
    const mdDir = join(root, "md")
    await mkdir(pdfDir, { recursive: true })
    await mkdir(mdDir, { recursive: true })
    writeFileSync(join(pdfDir, "Indonesia_BS_KLS_V_Rev.pdf"), "%PDF")
    writeFileSync(
      join(mdDir, "bahasa-indonesia-kelas-5.md"),
      [
        "# Bahasa Indonesia",
        "",
        "## Capaian Pembelajaran",
        "- Membaca.",
        "",
        "## Bab 1: Satu",
        "**Teks bacaan:** |",
        "  Isi.",
        "",
        "## Bab 2: Dua",
        "**Teks bacaan:** |",
        "  Isi lain.",
        ""
      ].join("\n")
    )

    const [row] = collectCurriculumStats({
      manifest: [manifestItem()],
      pdfDir,
      mdDir
    })

    expect(row).toMatchObject({
      slug: "bahasa-indonesia-kelas-5",
      pdfExists: true,
      mdExists: true,
      readiness: "ready",
      babCount: 2,
      teksBacaanCount: 2,
      sampleTeksBacaanCount: 0
    })
    expect(row?.mdBytes).toBeGreaterThan(0)
  })
})
