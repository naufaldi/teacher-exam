import { formatMathFallbackPlain, parseMathText, repairMatematikaLatexInText } from "@teacher-exam/shared"
import { Match } from "effect"
import katex from "katex"

function renderMath(value: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false
    })
  } catch {
    return null
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

/** Server-side mirror of apps/web MathText: renders mixed text + `$...$` math to an HTML string. */
export function renderMathText(text: string): string {
  const normalized = repairMatematikaLatexInText(text)
  return parseMathText(normalized)
    .map((part) =>
      Match.value(part).pipe(
        Match.tag("text", (p) => {
          const display = p.value.includes("$")
            ? formatMathFallbackPlain(p.value.replaceAll("$", ""))
            : p.value
          return escapeHtml(display)
        }),
        Match.tag("math", (p) => {
          const html = renderMath(p.value, p.displayMode)
          if (html !== null) return html
          return escapeHtml(formatMathFallbackPlain(p.value))
        }),
        Match.exhaustive
      )
    )
    .join("")
}
