export interface CpTipElement {
  readonly label: string
  readonly description: string
}

const BULLET_LINE_RE = /^- (.+)$/
const PLACEHOLDER_RE = /^[^:]+:\s*\.\.\.\s*$/
const MAX_TIPS = 4
const DEFAULT_MAX_DESC = 100

export function truncateForTips(text: string, maxLen = DEFAULT_MAX_DESC): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`
}

function extractCapaianPembelajaran(input: string): string | null {
  const marker = "## Capaian Pembelajaran"
  const startIdx = input.indexOf(marker)
  if (startIdx === -1) return null

  const lineEnd = input.indexOf("\n", startIdx + marker.length)
  if (lineEnd === -1) return null

  const contentStart = lineEnd + 1
  const nextSection = input.indexOf("\n## ", contentStart)
  const section = nextSection === -1 ? input.slice(contentStart) : input.slice(contentStart, nextSection)
  return section.trim() || null
}

function parseBulletLine(line: string): CpTipElement | null {
  const trimmed = line.trim()
  if (!trimmed || PLACEHOLDER_RE.test(trimmed)) return null

  const colonIdx = trimmed.indexOf(":")
  if (colonIdx > 0) {
    const rawLabel = trimmed.slice(0, colonIdx).trim()
    const description = truncateForTips(trimmed.slice(colonIdx + 1).trim())
    if (!description) return null
    const label = rawLabel.endsWith(".") ? rawLabel : `${rawLabel}.`
    return { label, description }
  }

  const words = trimmed.split(/\s+/)
  const firstWord = words[0] ?? "CP"
  const label = firstWord.endsWith(".") ? firstWord : `${firstWord}.`
  return { label, description: truncateForTips(trimmed) }
}

export function parseCpTipsFromCorpusText(text: string): ReadonlyArray<CpTipElement> {
  const section = extractCapaianPembelajaran(text)
  if (!section) return []

  const tips: Array<CpTipElement> = []
  for (const line of section.split("\n")) {
    const match = line.match(BULLET_LINE_RE)
    if (!match) continue
    const parsed = parseBulletLine(match[1] ?? "")
    if (parsed) tips.push(parsed)
    if (tips.length >= MAX_TIPS) break
  }

  return tips
}
