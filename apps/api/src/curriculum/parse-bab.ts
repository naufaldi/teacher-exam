export interface BabBlock {
  num: number
  title: string
  body: string
}

export function formatBabLabel(num: number, title: string): string {
  return `Bab ${num}: ${title}`
}

export function parseBabBlocks(input: string): Array<BabBlock> {
  const regex = /^## Bab (\d+):\s*(.+?)\s*$/gm
  const matches: Array<{ num: number; title: string; start: number; headerEnd: number }> = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    const numStr = match[1]
    const title = match[2]
    if (numStr === undefined || title === undefined) continue
    matches.push({
      num: Number.parseInt(numStr, 10),
      title,
      start: match.index,
      headerEnd: regex.lastIndex
    })
  }

  return matches.map((entry, index) => {
    const next = matches[index + 1]
    const end = next ? next.start : input.length
    const body = input.slice(entry.headerEnd, end).replace(/^\n+/, "").trimEnd()
    return { num: entry.num, title: entry.title, body }
  })
}

export function listBabTopicsFromMarkdown(
  text: string
): Array<{ bab: number; title: string; label: string }> {
  const blocks = parseBabBlocks(text)
  const byNumber = new Map<number, BabBlock>()
  for (const block of blocks) {
    if (!byNumber.has(block.num)) {
      byNumber.set(block.num, block)
    }
  }

  return [...byNumber.values()]
    .sort((a, b) => a.num - b.num)
    .map((block) => ({
      bab: block.num,
      title: block.title,
      label: formatBabLabel(block.num, block.title)
    }))
}
