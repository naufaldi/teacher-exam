export type MathTextPart =
  | { _tag: 'text'; value: string }
  | { _tag: 'math'; value: string; displayMode: boolean; raw: string }

export function parseMathText(text: string): MathTextPart[] {
  const parts: MathTextPart[] = []
  let cursor = 0

  while (cursor < text.length) {
    const start = text.indexOf('$', cursor)
    if (start === -1) {
      parts.push({ _tag: 'text', value: text.slice(cursor) })
      break
    }

    if (start > cursor) parts.push({ _tag: 'text', value: text.slice(cursor, start) })

    const displayMode = text.startsWith('$$', start)
    const delimiter = displayMode ? '$$' : '$'
    const contentStart = start + delimiter.length
    const end = text.indexOf(delimiter, contentStart)

    if (end === -1) {
      parts.push({ _tag: 'text', value: text.slice(start) })
      break
    }

    const value = text.slice(contentStart, end)
    const raw = text.slice(start, end + delimiter.length)
    parts.push({ _tag: 'math', value, displayMode, raw })
    cursor = end + delimiter.length
  }

  return parts
}
