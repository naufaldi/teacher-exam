import katex from 'katex'
import type { GeneratedQuestion } from '@teacher-exam/shared'

export type LatexValidationResult =
  | { _tag: 'valid' }
  | { _tag: 'invalid'; reason: string }

type TextPart =
  | { _tag: 'text'; value: string }
  | { _tag: 'math'; value: string; displayMode: boolean; raw: string }

export function validateLatexText(text: string): LatexValidationResult {
  const parts = parseMathText(text)
  for (const part of parts) {
    if (part._tag === 'text' && part.value.includes('$')) {
      return { _tag: 'invalid', reason: `Unclosed LaTeX delimiter in: ${text}` }
    }
    if (part._tag === 'math') {
      try {
        katex.renderToString(part.value, {
          displayMode: part.displayMode,
          throwOnError: true,
          strict: false,
          trust: false,
        })
      } catch (err) {
        return { _tag: 'invalid', reason: `Invalid LaTeX ${part.raw}: ${String(err)}` }
      }
    }
  }
  return { _tag: 'valid' }
}

export function validateGeneratedQuestionLatex(question: GeneratedQuestion): LatexValidationResult {
  const fields = generatedQuestionTextFields(question)
  for (const field of fields) {
    const result = validateLatexText(field)
    if (result._tag === 'invalid') return result
  }
  return { _tag: 'valid' }
}

function generatedQuestionTextFields(question: GeneratedQuestion): string[] {
  switch (question._tag) {
    case 'mcq_single':
      return [question.text, question.option_a, question.option_b, question.option_c, question.option_d]
    case 'mcq_multi':
      return [question.text, question.option_a, question.option_b, question.option_c, question.option_d]
    case 'true_false':
      return [question.text, ...question.statements.map((statement) => statement.text)]
  }
}

function parseMathText(text: string): TextPart[] {
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
