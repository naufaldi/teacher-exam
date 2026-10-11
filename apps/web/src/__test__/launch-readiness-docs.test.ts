import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(process.cwd(), "../..")

describe("2026-10-11 launch readiness docs", () => {
  it("names the product Ujian Sekolah and the API Effect HttpApi", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8")
    expect(readme.startsWith("# Ujian Sekolah\n")).toBe(true)
    expect(readme).not.toContain("Ujian SD")
    expect(readme).not.toContain("Hono")
    expect(readme).toContain("Effect HttpApi")
  })

  it("records the audit and no longer lists geometry diagrams as not started", () => {
    const roadmap = readFileSync(join(repoRoot, "docs/ROADMAP.md"), "utf8")
    expect(roadmap).toContain("## 2026-10-11 Launch readiness")
    expect(roadmap).toContain("d8e054c")
    expect(roadmap).toContain("kisi-kisi")
    expect(roadmap).not.toMatch(/Diagram Geometri \| Jul 15, 2026 \|.*Not started/)
    expect(roadmap).toContain("Partial")
    const prd = readFileSync(join(repoRoot, "docs/PRD-v2-final.md"), "utf8")
    expect(prd).toContain("2026-10-11 Launch readiness")
    expect(prd).toContain("kelas 1–6")
    expect(prd).toContain("#254")
  })
})
