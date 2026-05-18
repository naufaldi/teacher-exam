import type { ReactNode } from 'react'
import katex from 'katex'

type MathTextProps = {
  text: string
}

type TextPart =
  | { _tag: 'text'; value: string }
  | { _tag: 'math'; value: string; displayMode: boolean; raw: string }

export function MathText({ text }: MathTextProps): ReactNode {
  return (
    <>
      {parseMathText(text).map((part, index) => {
        if (part._tag === 'text') return <span key={index}>{part.value}</span>

        const html = renderMath(part.value, part.displayMode)
        return html === null
          ? <span key={index}>{part.raw}</span>
          : <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </>
  )
}

export function parseMathText(text: string): TextPart[] {
  const parts: TextPart[] = []
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

function renderMath(value: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: true,
      strict: false,
      trust: false,
    })
  } catch {
    return null
  }
}
