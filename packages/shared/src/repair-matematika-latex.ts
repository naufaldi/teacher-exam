import { parseMathText } from './parse-math-text.js'

function repairMathSegment(math: string): string {
  let s = math
  s = s.replace(/[\t ]+imes\b/g, ' \\times')
  s = s.replace(/\bimes\b/g, '\\times')
  s = s.replace(/(?:\f|\u000c)rac\{/g, '\\frac{')
  s = s.replace(/(?<![a-z\\])rac\{/g, '\\frac{')
  s = s.replace(/\bqrt\{/g, '\\sqrt{')
  s = s.replace(/(\d[\d.,]*)\s+div\s+(\d[\d.,]*)/g, '$1 \\div $2')
  return s
}

/** Fix common corrupted LaTeX commands inside `$...$` / `$$...$$` segments. */
export function repairMatematikaLatexInText(text: string): string {
  return parseMathText(text)
    .map((part) => {
      if (part._tag === 'text') return part.value
      const repaired = repairMathSegment(part.value)
      return part.displayMode ? `$$${repaired}$$` : `$${repaired}$`
    })
    .join('')
}

/** Detect corrupted LaTeX tokens that KaTeX may silently mis-render. */
export function detectBrokenMatematikaLatex(text: string): string[] {
  const issues: string[] = []

  for (const part of parseMathText(text)) {
    if (part._tag !== 'math') continue
    const v = part.value
    if (/\bimes\b/.test(v) || /\t+imes\b/.test(v)) issues.push('imes → \\times')
    if (/\brac\{/.test(v)) issues.push('rac{ → \\frac{')
    if (/\bqrt\{/.test(v)) issues.push('qrt{ → \\sqrt{')
    if (/(\d[\d.,]*)\s+div\s+(\d[\d.,]*)/.test(v)) issues.push('div → \\div')
  }

  return [...new Set(issues)]
}
