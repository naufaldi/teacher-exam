/**
 * Deterministic post-processor for chunked extraction output.
 *
 * Concatenated chunk markdown can contain (a) duplicate H1 + Capaian
 * Pembelajaran sections from chunks emitted by mistake, and (b) Bab blocks
 * that appear twice because consecutive chunks overlap by a few pages. This
 * collapses both into one clean document with sequentially numbered Bab
 * sections.
 */

export const REQUIRED_FIELDS = [
  'Topik utama',
  'Sub-konsep',
  'Sample teks bacaan',
  'Kosakata kunci',
  'Kompetensi yang diuji',
] as const

export class MergeValidationError extends Error {
  constructor(
    message: string,
    public readonly details: { babNumbers: number[]; missingFields: Array<{ bab: number; field: string }> },
  ) {
    super(message)
    this.name = 'MergeValidationError'
  }
}

interface BabBlock {
  num: number
  title: string
  body: string
}

/**
 * Merge concatenated chunk markdown into a single normalized document.
 * Throws `MergeValidationError` when required structure is missing so the
 * caller can fall back to an LLM-driven consolidation pass.
 */
export function mergeBab(concatenated: string): string {
  const h1 = extractH1(concatenated)
  if (!h1) throw new MergeValidationError('missing H1 header', { babNumbers: [], missingFields: [] })

  const cp = extractCapaianPembelajaran(concatenated)
  if (!cp) throw new MergeValidationError('missing ## Capaian Pembelajaran section', { babNumbers: [], missingFields: [] })

  const blocks = parseBabBlocks(concatenated)
  if (blocks.length === 0) {
    throw new MergeValidationError('no Bab blocks found', { babNumbers: [], missingFields: [] })
  }

  const grouped = new Map<number, BabBlock>()
  for (const block of blocks) {
    const existing = grouped.get(block.num)
    if (!existing || block.body.length > existing.body.length) {
      grouped.set(block.num, block)
    }
  }

  const sorted = [...grouped.values()].sort((a, b) => a.num - b.num)
  const numbers = sorted.map((b) => b.num)
  const [expected] = numbers as [number, ...number[]]
  for (let i = 0; i < numbers.length; i += 1) {
    if (numbers[i] !== expected + i) {
      throw new MergeValidationError(`non-sequential Bab numbers: ${numbers.join(', ')}`, {
        babNumbers: numbers,
        missingFields: [],
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
    const summary = missingFields.map((m) => `Bab ${m.bab}: ${m.field}`).join('; ')
    throw new MergeValidationError(`missing required fields — ${summary}`, { babNumbers: numbers, missingFields })
  }

  const body = sorted.map((b) => `## Bab ${b.num}: ${b.title}\n${b.body.trimEnd()}`).join('\n\n')
  return `${h1}\n\n## Capaian Pembelajaran\n${cp.trimEnd()}\n\n${body}\n`
}

function extractH1(input: string): string | null {
  const match = input.match(/^# .+$/m)
  return match ? match[0] : null
}

function extractCapaianPembelajaran(input: string): string | null {
  const match = input.match(/^## Capaian Pembelajaran\s*\n([\s\S]*?)(?=^## |\Z)/m)
  return match ? (match[1] ?? '').trim() : null
}

function parseBabBlocks(input: string): BabBlock[] {
  const regex = /^## Bab (\d+):\s*(.+?)\s*$/gm
  const matches: Array<{ num: number; title: string; start: number; headerEnd: number }> = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(input)) !== null) {
    const numStr = m[1]
    const title = m[2]
    if (numStr === undefined || title === undefined) continue
    matches.push({
      num: Number.parseInt(numStr, 10),
      title,
      start: m.index,
      headerEnd: regex.lastIndex,
    })
  }

  return matches.map((entry, i) => {
    const next = matches[i + 1]
    const end = next ? next.start : input.length
    const body = input.slice(entry.headerEnd, end).replace(/^\n+/, '').trimEnd()
    return { num: entry.num, title: entry.title, body }
  })
}
