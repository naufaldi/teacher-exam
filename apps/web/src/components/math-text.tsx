import type { ReactNode } from 'react'
import katex from 'katex'
import { parseMathText, formatMathFallbackPlain, repairMatematikaLatexInText } from '@teacher-exam/shared'

type MathTextProps = {
  text: string
  repair?: boolean
}

export function MathText({ text, repair = true }: MathTextProps): ReactNode {
  const normalized = repair ? repairMatematikaLatexInText(text) : text

  return (
    <>
      {parseMathText(normalized).map((part, index) => {
        if (part._tag === 'text') {
          const display = part.value.includes('$')
            ? formatMathFallbackPlain(part.value.replace(/\$/g, ''))
            : part.value
          return <span key={index}>{display}</span>
        }

        const html = renderMath(part.value, part.displayMode)
        if (html !== null) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
        }
        return <span key={index}>{formatMathFallbackPlain(part.value)}</span>
      })}
    </>
  )
}

export { parseMathText } from '@teacher-exam/shared'

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
