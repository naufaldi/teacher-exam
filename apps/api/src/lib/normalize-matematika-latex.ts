import { repairMatematikaLatexInText } from "@teacher-exam/shared"
import type { GeneratedQuestion } from "@teacher-exam/shared"
import { Match } from "effect"

/** Safe pre-validation fixes for common Matematika LaTeX mistakes from AI. */
export function normalizeMatematikaLatexField(text: string): string {
  let s = text.trim()
  if (/^\$[A-Za-zÀ-ÿ]/.test(s)) {
    s = s.replace(/^\$+/, "")
  }
  return repairMatematikaLatexInText(s)
}

export function normalizeGeneratedQuestionLatexFields(question: GeneratedQuestion): GeneratedQuestion {
  const norm = (text: string) => normalizeMatematikaLatexField(text)

  return Match.value(question).pipe(
    Match.tag("mcq_single", (q) => ({
      ...q,
      text: norm(q.text),
      option_a: norm(q.option_a),
      option_b: norm(q.option_b),
      option_c: norm(q.option_c),
      option_d: norm(q.option_d)
    })),
    Match.tag("mcq_multi", (q) => ({
      ...q,
      text: norm(q.text),
      option_a: norm(q.option_a),
      option_b: norm(q.option_b),
      option_c: norm(q.option_c),
      option_d: norm(q.option_d)
    })),
    Match.tag("true_false", (q) => ({
      ...q,
      text: norm(q.text),
      statements: q.statements.map((statement) => ({
        ...statement,
        text: norm(statement.text)
      }))
    })),
    Match.exhaustive
  )
}
