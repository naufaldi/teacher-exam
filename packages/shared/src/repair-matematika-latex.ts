import { parseMathText } from "./parse-math-text.js"

function repairMathSegment(math: string): string {
  let s = math
  s = s.replace(/[\t ]+imes\b/g, " \\times")
  s = s.replace(/\bimes\b/g, "\\times")
  // eslint-disable-next-line no-control-regex -- intentional: match form-feed corruption of \frac
  s = s.replace(/(?:\f|\u000c)rac\{/g, "\\frac{")
  s = s.replace(/(?<![a-z\\])rac\{/g, "\\frac{")
  s = s.replace(/\bqrt\{/g, "\\sqrt{")
  s = s.replace(/(\d[\d.,]*)\s+div\s+(\d[\d.,]*)/g, "$1 \\div $2")
  return s
}

function repairPlainTextSegment(text: string): string {
  let s = text
  s = s.replace(/(?<![a-z\\])rac\{([^}]*)\}\{([^}]*)\}/g, (_, num, den) => `$\\frac{${num}}{${den}}$`)
  s = s.replace(/(?<![a-z\\])\bqrt\{([^}]*)\}/g, (_, n) => `$\\sqrt{${n}}$`)
  s = s.replace(/(\d[\d.,]*)\s+imes\s+(\d[\d.,]*)/g, (_, a, b) => `$${a} \\times ${b}$`)
  s = s.replace(/(\d[\d.,]*)\s+div\s+(\d[\d.,]*)/g, (_, a, b) => `$${a} \\div ${b}$`)
  s = s.replace(/(?<![$\\a-z])\\frac\{([^}]*)\}\{([^}]*)\}/g, (_, num, den) => `$\\frac{${num}}{${den}}$`)
  return s
}

/** Fix common corrupted LaTeX commands inside `$...$` / `$$...$$` segments and bare plain text. */
export function repairMatematikaLatexInText(text: string): string {
  const withPlainRepaired = parseMathText(text)
    .map((part) => {
      if (part._tag === "math") return part.raw
      return repairPlainTextSegment(part.value)
    })
    .join("")

  return parseMathText(withPlainRepaired)
    .map((part) => {
      if (part._tag === "text") return part.value
      const repaired = repairMathSegment(part.value)
      return part.displayMode ? `$$${repaired}$$` : `$${repaired}$`
    })
    .join("")
}

function detectBrokenInSegment(segment: string, issues: Array<string>): void {
  if (/\bimes\b/.test(segment) || /\t+imes\b/.test(segment)) issues.push("imes → \\times")
  if (/\brac\{/.test(segment)) issues.push("rac{ → \\frac{")
  if (/\bqrt\{/.test(segment)) issues.push("qrt{ → \\sqrt{")
  if (/(\d[\d.,]*)\s+div\s+(\d[\d.,]*)/.test(segment)) issues.push("div → \\div")
}

/** Detect corrupted LaTeX tokens that KaTeX may silently mis-render. */
export function detectBrokenMatematikaLatex(text: string): Array<string> {
  const issues: Array<string> = []

  for (const part of parseMathText(text)) {
    detectBrokenInSegment(part.value, issues)
  }

  return [...new Set(issues)]
}
