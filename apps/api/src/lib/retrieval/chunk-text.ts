export interface TextChunk {
  readonly content: string
  readonly metadata: Record<string, unknown>
}

const DEFAULT_CHUNK_SIZE = 1500
const DEFAULT_OVERLAP = 200

export function chunkText(
  text: string,
  metadata: Record<string, unknown> = {},
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP
): ReadonlyArray<TextChunk> {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (normalized.length === 0) return []

  const chunks: Array<TextChunk> = []
  let start = 0
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length)
    const slice = normalized.slice(start, end).trim()
    if (slice.length > 0) {
      chunks.push({
        content: slice,
        metadata: { ...metadata, chunkIndex: chunks.length }
      })
    }
    if (end >= normalized.length) break
    start = Math.max(0, end - overlap)
  }
  return chunks
}

export function chunkCorpusMarkdown(
  markdown: string,
  subject: string,
  grade: number
): ReadonlyArray<TextChunk> {
  const sections = markdown.split(/(?=^## Bab \d+:)/m).filter((section) => section.trim().length > 0)
  const chunks: Array<TextChunk> = []

  for (const section of sections) {
    const babMatch = /^## Bab (\d+):\s*(.+)$/m.exec(section)
    const babNumber = babMatch?.[1] ?? "0"
    const babTitle = babMatch?.[2]?.trim() ?? "Umum"
    const babHint = `Bab ${babNumber}: ${babTitle}`
    for (const piece of chunkText(section, { subject, grade, babHint, babNumber })) {
      chunks.push(piece)
    }
  }

  if (chunks.length === 0) {
    return chunkText(markdown, { subject, grade, babHint: "Umum" })
  }
  return chunks
}
