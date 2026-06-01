import { formatMathFallbackPlain, parseMathText, repairMatematikaLatexInText } from "@teacher-exam/shared"
import katex from "katex"
import { Match } from "effect"
import type { ReactNode } from "react"

type MathTextProps = {
  text: string
  repair?: boolean
}

export function MathText({ repair = true, text }: MathTextProps): ReactNode {
  const normalized = repair ? repairMatematikaLatexInText(text) : text

  return (
    <>
      {parseMathText(normalized).map((part, index) => {
        return Match.value(part).pipe(
          Match.tag("text", (p) => {
            const display = p.value.includes("$")
              ? formatMathFallbackPlain(p.value.replace(/\$/g, ""))
              : p.value
            return <span key={index}>{display}</span>
          }),
          Match.tag("math", (p) => {
            const html = renderMath(p.value, p.displayMode)
            if (html !== null) {
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
            }
            return <span key={index}>{formatMathFallbackPlain(p.value)}</span>
          }),
          Match.exhaustive
        )
      })}
    </>
  )
}

export { parseMathText } from "@teacher-exam/shared"

function renderMath(value: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: true,
      strict: false,
      trust: false
    })
  } catch {
    return null
  }
}
