import type { ExamSubject } from "@teacher-exam/shared"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { REQUIRED_FIELDS } from "../../../scripts/lib/merge-bab"
import { curriculumMdFilename } from "../../lib/curriculum"
import { listExtractableBooks } from "../readiness.js"

interface BookCase {
  slug: string
  subject: string
  grade: number
  expectedMinBab: number
  /** When the PDF H1 uses a longer official title (e.g. IPAS). */
  h1Alternates?: ReadonlyArray<string>
}

const EXPECTED_MIN_BAB: Record<string, number> = {
  "bahasa-indonesia-kelas-5": 4,
  "bahasa-indonesia-kelas-6": 8,
  "pendidikan-pancasila-kelas-5": 4,
  "pendidikan-pancasila-kelas-6": 7,
  "ipas-kelas-5": 4,
  "ipas-kelas-6": 6,
  "bahasa-inggris-kelas-5": 6,
  "bahasa-inggris-kelas-6": 6
}

const H1_ALTERNATES: Record<string, ReadonlyArray<string>> = {
  "ipas-kelas-5": ["Ilmu Pengetahuan Alam dan Sosial"],
  "ipas-kelas-6": ["Ilmu Pengetahuan Alam dan Sosial"]
}

const BOOKS: Array<BookCase> = listExtractableBooks().map((entry) => {
  const slug = curriculumMdFilename(entry.subjectKey as ExamSubject, entry.grade).replace(/\.md$/, "")
  const expectedMinBab = EXPECTED_MIN_BAB[slug]
  if (expectedMinBab === undefined) {
    throw new Error(`missing expectedMinBab test metadata for ${slug}`)
  }
  return {
    slug,
    subject: entry.label,
    grade: entry.grade,
    expectedMinBab,
    h1Alternates: H1_ALTERNATES[slug] ?? []
  }
})

const MD_DIR = join(__dirname, "..", "md")

const GRADE_ROMAN: Record<number, string> = { 5: "V", 6: "VI" }

function matchesH1(text: string, label: string, grade: number): boolean {
  const roman = GRADE_ROMAN[grade]
  return (
    new RegExp(`^# ${label} — Kelas ${grade} `, "m").test(text) ||
    (roman !== undefined && new RegExp(`^# ${label} — Kelas ${roman} `, "m").test(text))
  )
}

describe("curriculum extraction output", () => {
  for (const book of BOOKS) {
    const path = join(MD_DIR, `${book.slug}.md`)
    it(`${book.slug} matches schema`, () => {
      expect(existsSync(path)).toBe(true)
      const text = readFileSync(path, "utf-8")
      const size = statSync(path).size
      expect(size).toBeGreaterThan(5 * 1024)
      expect(size).toBeLessThan(200 * 1024)

      const h1Labels = [book.subject, ...(book.h1Alternates ?? [])]
      expect(h1Labels.some((label) => matchesH1(text, label, book.grade))).toBe(true)
      expect(text).toMatch(/^## Capaian Pembelajaran$/m)

      const bullets = text.match(/^## Capaian Pembelajaran\s*\n([\s\S]*?)(?=^## )/m)?.[1] ?? ""
      const bulletCount = bullets.split("\n").filter((l) => l.trim().startsWith("- ")).length
      expect(bulletCount).toBeGreaterThanOrEqual(1)

      const babMatches = [...text.matchAll(/^## Bab (\d+):/gm)].map((m) => Number.parseInt(m[1] ?? "0", 10))
      expect(babMatches.length).toBeGreaterThanOrEqual(book.expectedMinBab)
      expect(new Set(babMatches).size).toBe(babMatches.length)
      for (let i = 0; i < babMatches.length; i += 1) {
        expect(babMatches[i]).toBe(i + 1)
      }

      for (const field of REQUIRED_FIELDS) {
        expect(text).toContain(`**${field}:`)
      }
    })
  }
})

describe("curriculum markdown filename resolver", () => {
  it("resolves PRD v3 phase 1 subject filenames", () => {
    expect(curriculumMdFilename("ipas", 5)).toBe("ipas-kelas-5.md")
    expect(curriculumMdFilename("bahasa_inggris", 6)).toBe("bahasa-inggris-kelas-6.md")
  })
})
