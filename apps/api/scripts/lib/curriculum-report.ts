import type { CurriculumSourceManifestItem } from "@teacher-exam/shared"
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { CURRICULUM_MANIFEST } from "../../src/curriculum/manifest.js"

const SCRIPT_LIB_DIR = dirname(fileURLToPath(import.meta.url))
const API_ROOT = join(SCRIPT_LIB_DIR, "..", "..")

export const DEFAULT_CURRICULUM_PDF_DIR = join(API_ROOT, "src", "curriculum", "pdf")
export const DEFAULT_CURRICULUM_MD_DIR = join(API_ROOT, "src", "curriculum", "md")

export type CurriculumReadiness =
  | "ready"
  | "missing_pdf"
  | "missing_md"
  | "not_extractable"

export interface CurriculumReportInput {
  manifest?: ReadonlyArray<CurriculumSourceManifestItem>
  pdfDir?: string
  mdDir?: string
}

export interface CurriculumListRow {
  slug: string
  subjectKey: string
  label: string
  grade: number
  status: CurriculumSourceManifestItem["status"]
  sourceType: CurriculumSourceManifestItem["sourceType"]
  sourceFilename: string | null
  pdfPath: string | null
  pdfExists: boolean
  mdPath: string
  mdExists: boolean
  extractable: boolean
  readiness: CurriculumReadiness
}

export interface CurriculumStatsRow extends CurriculumListRow {
  mdBytes: number
  babCount: number
  teksBacaanCount: number
  sampleTeksBacaanCount: number
}

function slugFor(entry: CurriculumSourceManifestItem): string {
  return `${entry.subjectKey.replaceAll("_", "-")}-kelas-${entry.grade}`
}

function countMatches(input: string, pattern: RegExp): number {
  return input.match(pattern)?.length ?? 0
}

function readinessFor(input: {
  extractable: boolean
  pdfExists: boolean
  mdExists: boolean
}): CurriculumReadiness {
  if (!input.extractable) return "not_extractable"
  if (!input.pdfExists) return "missing_pdf"
  if (!input.mdExists) return "missing_md"
  return "ready"
}

export function collectCurriculumList(
  input: CurriculumReportInput = {}
): ReadonlyArray<CurriculumListRow> {
  const manifest = input.manifest ?? CURRICULUM_MANIFEST
  const pdfDir = input.pdfDir ?? DEFAULT_CURRICULUM_PDF_DIR
  const mdDir = input.mdDir ?? DEFAULT_CURRICULUM_MD_DIR

  return manifest.map((entry) => {
    const slug = slugFor(entry)
    const mdPath = join(mdDir, `${slug}.md`)
    const sourceFilename = entry.sourceFilename ?? null
    const pdfPath = sourceFilename === null ? null : join(pdfDir, sourceFilename)
    const pdfExists = pdfPath === null ? false : existsSync(pdfPath)
    const mdExists = existsSync(mdPath)
    const extractable = entry.sourceType === "sibi_pdf" && entry.status === "ready"

    return {
      slug,
      subjectKey: entry.subjectKey,
      label: entry.label,
      grade: entry.grade,
      status: entry.status,
      sourceType: entry.sourceType,
      sourceFilename,
      pdfPath,
      pdfExists,
      mdPath,
      mdExists,
      extractable,
      readiness: readinessFor({ extractable, pdfExists, mdExists })
    }
  })
}

export function collectCurriculumStats(
  input: CurriculumReportInput = {}
): ReadonlyArray<CurriculumStatsRow> {
  return collectCurriculumList(input).map((row) => {
    if (!row.mdExists) {
      return {
        ...row,
        mdBytes: 0,
        babCount: 0,
        teksBacaanCount: 0,
        sampleTeksBacaanCount: 0
      }
    }

    const text = readFileSync(row.mdPath, "utf-8")
    return {
      ...row,
      mdBytes: statSync(row.mdPath).size,
      babCount: countMatches(text, /^## Bab /gm),
      teksBacaanCount: countMatches(text, /^\*\*Teks bacaan:\*\*/gm),
      sampleTeksBacaanCount: countMatches(text, /^\*\*Sample teks bacaan:\*\*/gm)
    }
  })
}

export function formatCurriculumList(rows: ReadonlyArray<CurriculumListRow>): string {
  const header = ["slug", "status", "source", "pdf", "md", "readiness"]
  const body = rows.map((row) => [
    row.slug,
    row.status,
    row.sourceType,
    row.pdfExists ? "yes" : "no",
    row.mdExists ? "yes" : "no",
    row.readiness
  ])
  return [header, ...body].map((cells) => cells.join("\t")).join("\n")
}

export function formatCurriculumStats(rows: ReadonlyArray<CurriculumStatsRow>): string {
  const header = ["slug", "pdf", "md", "mdBytes", "bab", "teksBacaan", "sampleTeks", "readiness"]
  const body = rows.map((row) => [
    row.slug,
    row.pdfExists ? "yes" : "no",
    row.mdExists ? "yes" : "no",
    String(row.mdBytes),
    String(row.babCount),
    String(row.teksBacaanCount),
    String(row.sampleTeksBacaanCount),
    row.readiness
  ])
  return [header, ...body].map((cells) => cells.join("\t")).join("\n")
}
