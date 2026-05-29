/** Plain-text fallback when KaTeX cannot render (no `$` delimiters in output). */
export function formatMathFallbackPlain(latex: string): string {
  let s = latex.trim()
  if (s.startsWith("$") && s.endsWith("$")) {
    s = s.startsWith("$$") && s.endsWith("$$") ? s.slice(2, -2) : s.slice(1, -1)
  }
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}?/g, "$1/$2")
  s = s.replace(/\\div\b/g, "÷")
  s = s.replace(/\\times\b/g, "×")
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√$1")
  return s.trim()
}
