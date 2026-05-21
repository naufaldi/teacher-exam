import katex from 'katex'
import { parseMathText, detectBrokenMatematikaLatex, type MathTextPart } from '@teacher-exam/shared'
import type { GeneratedQuestion } from '@teacher-exam/shared'
import { normalizeMatematikaLatexField } from './normalize-matematika-latex.js'

export type LatexValidationResult =
  | { _tag: 'valid' }
  | { _tag: 'invalid'; reason: string }

const UNDELIMITED_MATH_RE = /\\(?:div|frac|sqrt|times)\b/

export function validateLatexText(text: string): LatexValidationResult {
  const broken = detectBrokenMatematikaLatex(text)
  if (broken.length > 0) {
    return {
      _tag: 'invalid',
      reason: `Corrupted LaTeX command (missing backslash): ${broken.join(', ')}`,
    }
  }

  const normalized = normalizeMatematikaLatexField(text)
  const parts = parseMathText(normalized)

  const undelimited = findUndelimitedMathInPlainParts(parts)
  if (undelimited !== null) {
    return { _tag: 'invalid', reason: `LaTeX command outside delimiters: ${undelimited}` }
  }

  for (const part of parts) {
    if (part._tag === 'text' && part.value.includes('$')) {
      return { _tag: 'invalid', reason: `Unclosed LaTeX delimiter in: ${normalized}` }
    }
    if (part._tag === 'math') {
      if (/Rp[\d.]/.test(part.value)) {
        return { _tag: 'invalid', reason: `Currency must stay outside $...$: ${part.raw}` }
      }
      if (isNarrativeInsideMath(part.value)) {
        return { _tag: 'invalid', reason: `Narrative text inside math delimiters: ${part.raw}` }
      }
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

function findUndelimitedMathInPlainParts(parts: MathTextPart[]): string | null {
  for (const part of parts) {
    if (part._tag !== 'text') continue
    const match = part.value.match(UNDELIMITED_MATH_RE)
    if (match !== null) return match[0] ?? part.value.slice(0, 40)
  }
  return null
}

function isNarrativeInsideMath(value: string): boolean {
  if (value.length < 24) return false
  const letters = (value.match(/[A-Za-zÀ-ÿ]/g) ?? []).length
  if (letters < 12) return false
  return /\s/.test(value) && /[A-Za-zÀ-ÿ]{4,}/.test(value)
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
