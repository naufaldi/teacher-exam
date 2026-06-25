/**
 * Deterministic post-processor for chunked extraction output.
 *
 * Concatenated chunk markdown can contain (a) duplicate H1 + Capaian
 * Pembelajaran sections from chunks emitted by mistake, and (b) Bab blocks
 * that appear twice because consecutive chunks overlap by a few pages. This
 * collapses both into one clean document with sequentially numbered Bab
 * sections.
 */

import { type BabBlock, parseBabBlocks } from "../../src/curriculum/parse-bab.js"

export const REQUIRED_FIELDS = [
  "Topik utama",
  "Sub-konsep",
  "Teks bacaan",
  "Kosakata kunci",
  "Kompetensi yang diuji"
] as const

export class MergeValidationError extends Error {
  constructor(
    message: string,
    public readonly details: { babNumbers: Array<number>; missingFields: Array<{ bab: number; field: string }> }
  ) {
    super(message)
    this.name = "MergeValidationError"
  }
}

/**
 * Merge concatenated chunk markdown into a single normalized document.
 * Throws `MergeValidationError` when required structure is missing so the
 * caller can fall back to an LLM-driven consolidation pass.
 */
export function mergeBab(concatenated: string): string {
  const h1 = extractH1(concatenated)
  if (!h1) throw new MergeValidationError("missing H1 header", { babNumbers: [], missingFields: [] })

  const cp = extractCapaianPembelajaran(concatenated)
  if (!cp) {
    throw new MergeValidationError("missing ## Capaian Pembelajaran section", { babNumbers: [], missingFields: [] })
  }

  const blocks = parseBabBlocks(concatenated)
  if (blocks.length === 0) {
    throw new MergeValidationError("no Bab blocks found", { babNumbers: [], missingFields: [] })
  }

  const grouped = new Map<number, BabBlock>()
  for (const block of blocks) {
    const existing = grouped.get(block.num)
    if (!existing || shouldReplaceBlock(existing, block)) {
      grouped.set(block.num, block)
    }
  }

  const sorted = [...grouped.values()].sort((a, b) => a.num - b.num)
  const numbers = sorted.map((b) => b.num)
  const [expected] = numbers as [number, ...Array<number>]
  for (let i = 0; i < numbers.length; i += 1) {
    if (numbers[i] !== expected + i) {
      throw new MergeValidationError(`non-sequential Bab numbers: ${numbers.join(", ")}`, {
        babNumbers: numbers,
        missingFields: []
      })
    }
  }

  const missingFields: Array<{ bab: number; field: string }> = []
  for (const block of sorted) {
    for (const field of REQUIRED_FIELDS) {
      if (!block.body.includes(`**${field}:`)) {
        missingFields.push({ bab: block.num, field })
      }
    }
  }
  if (missingFields.length > 0) {
    const summary = missingFields.map((m) => `Bab ${m.bab}: ${m.field}`).join("; ")
    throw new MergeValidationError(`missing required fields — ${summary}`, { babNumbers: numbers, missingFields })
  }

  const body = sorted.map((b) => `## Bab ${b.num}: ${b.title}\n${b.body.trimEnd()}`).join("\n\n")
  return `${h1}\n\n## Capaian Pembelajaran\n${cp.trimEnd()}\n\n${body}\n`
}

function extractH1(input: string): string | null {
  const match = input.match(/^# .+$/m)
  return match ? match[0] : null
}

function extractCapaianPembelajaran(input: string): string | null {
  const match = input.match(/^## Capaian Pembelajaran\s*\n([\s\S]*?)(?=^## |$)/m)
  return match ? (match[1] ?? "").trim() : null
}

function completedFieldCount(block: BabBlock): number {
  return REQUIRED_FIELDS.filter((field) => block.body.includes(`**${field}:`)).length
}

function shouldReplaceBlock(existing: BabBlock, candidate: BabBlock): boolean {
  const existingFields = completedFieldCount(existing)
  const candidateFields = completedFieldCount(candidate)
  if (candidateFields !== existingFields) return candidateFields > existingFields
  return candidate.body.length > existing.body.length
}
