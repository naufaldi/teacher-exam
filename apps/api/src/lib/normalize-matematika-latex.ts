import { repairMatematikaLatexInText } from '@teacher-exam/shared'
import type { GeneratedQuestion } from '@teacher-exam/shared'

/** Safe pre-validation fixes for common Matematika LaTeX mistakes from AI. */
export function normalizeMatematikaLatexField(text: string): string {
  let s = text.trim()
  if (/^\$[A-Za-zÀ-ÿ]/.test(s)) {
    s = s.replace(/^\$+/, '')
  }
  return repairMatematikaLatexInText(s)
}

export function normalizeGeneratedQuestionLatexFields(question: GeneratedQuestion): GeneratedQuestion {
  const norm = (text: string) => normalizeMatematikaLatexField(text)

  switch (question._tag) {
    case 'mcq_single':
      return {
        ...question,
        text: norm(question.text),
        option_a: norm(question.option_a),
        option_b: norm(question.option_b),
        option_c: norm(question.option_c),
        option_d: norm(question.option_d),
      }
    case 'mcq_multi':
      return {
        ...question,
        text: norm(question.text),
        option_a: norm(question.option_a),
        option_b: norm(question.option_b),
        option_c: norm(question.option_c),
        option_d: norm(question.option_d),
      }
    case 'true_false':
      return {
        ...question,
        text: norm(question.text),
        statements: question.statements.map((statement) => ({
          ...statement,
          text: norm(statement.text),
        })),
      }
  }
}
