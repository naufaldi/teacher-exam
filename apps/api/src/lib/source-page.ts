import type { Question } from "@teacher-exam/shared"

const PAGE_MARKER = /\[hal\. (\d+)\]/g

function pagesInMaterial(material: string): ReadonlySet<number> {
  const pages = new Set<number>()
  for (const match of material.matchAll(PAGE_MARKER)) {
    const page = Number(match[1])
    if (Number.isInteger(page) && page >= 1) pages.add(page)
  }
  return pages
}

function significantWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/\p{L}{4,}/gu) ?? []
  return new Set(words)
}

function blocksInMaterial(material: string): Array<{ page: number; text: string }> {
  const parts = material.split(/\[hal\. (\d+)\]/)
  const blocks: Array<{ page: number; text: string }> = []
  for (let i = 1; i < parts.length; i += 2) {
    const page = Number(parts[i])
    const text = parts[i + 1] ?? ""
    if (Number.isInteger(page) && page >= 1) blocks.push({ page, text })
  }
  return blocks
}

export function formatChunkWithPage(content: string, metadata: Record<string, unknown>): string {
  const page = metadata["page"]
  if (typeof page === "number" && Number.isInteger(page) && page >= 1) {
    return `[hal. ${page}]\n${content}`
  }
  return content
}

export function sourcePageFromMaterial(
  questionText: string,
  material: string,
  modelPage?: number
): number | undefined {
  const pages = pagesInMaterial(material)
  if (modelPage !== undefined && pages.has(modelPage)) return modelPage

  const blocks = blocksInMaterial(material)
  const first = blocks[0]
  if (first === undefined) return undefined

  const questionWords = significantWords(questionText)
  let bestPage = first.page
  let bestScore = -1
  for (const block of blocks) {
    let score = 0
    for (const word of significantWords(block.text)) {
      if (questionWords.has(word)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestPage = block.page
    }
  }
  return bestPage
}

export function citeQuestionSourcePage(question: Question, material: string): Question {
  if (question.generationFailed === true) return question
  const page = question.sourcePage !== undefined
    ? sourcePageFromMaterial(question.text, material, question.sourcePage)
    : sourcePageFromMaterial(question.text, material)
  if (page === undefined) return question
  return { ...question, sourcePage: page }
}
