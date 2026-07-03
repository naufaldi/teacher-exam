import type { McqMultiQuestion, McqSingleQuestion, Question, TrueFalseQuestion } from "@teacher-exam/shared"
import { repairMatematikaLatexInText } from "@teacher-exam/shared"
import { Match } from "effect"
import { matchQuestion } from "../../lib/question-render.js"

export const LETTERS = ["a", "b", "c", "d"] as const

export const MATH_INSERTS = [
  { label: "×", snippet: " $\\times$ ", ariaLabel: "Sisipkan kali" },
  { label: "÷", snippet: " $\\div$ ", ariaLabel: "Sisipkan bagi" },
  { label: "√", snippet: " $\\sqrt{}$ ", ariaLabel: "Sisipkan akar" },
  { label: "pecahan", snippet: " $\\frac{}{}$ ", ariaLabel: "Sisipkan pecahan" },
  { label: "pangkat", snippet: " $^{}$ ", ariaLabel: "Sisipkan pangkat" }
] as const

export function insertSnippet(
  textarea: HTMLTextAreaElement,
  current: string,
  snippet: string
): { next: string; cursor: number } {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const next = current.slice(0, start) + snippet + current.slice(end)
  const cursorOffset = snippet.includes("{}")
    ? snippet.indexOf("{}") + 1
    : snippet.length
  return { next, cursor: start + cursorOffset }
}

export function applyMatematikaTextRepair(text: string): string {
  let s = text.trim()
  if (/^\$[A-Za-zÀ-ÿ]/.test(s)) {
    s = s.replace(/^\$+/, "")
  }
  return repairMatematikaLatexInText(s)
}

export function getPreviewText(raw: string, isMatematika: boolean): string {
  return isMatematika ? applyMatematikaTextRepair(raw) : raw
}

// ── Per-type state shapes ─────────────────────────────────────────────────

export interface McqSingleState {
  _tag: "mcq_single"
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: "a" | "b" | "c" | "d"
}

export interface McqMultiState {
  _tag: "mcq_multi"
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: Array<"a" | "b" | "c" | "d">
}

export interface TrueFalseState {
  _tag: "true_false"
  text: string
  statements: Array<{ text: string; answer: boolean }>
}

export type EditState = McqSingleState | McqMultiState | TrueFalseState

export function initState(question: Question): EditState {
  return matchQuestion<EditState>(question, {
    mcq_single: (q) => ({
      _tag: "mcq_single" as const,
      text: q.text,
      options: { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d },
      correct: q.correct
    }),
    mcq_multi: (q) => ({
      _tag: "mcq_multi" as const,
      text: q.text,
      options: { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d },
      correct: [...q.correct] as Array<"a" | "b" | "c" | "d">
    }),
    true_false: (q) => ({
      _tag: "true_false" as const,
      text: q.text,
      statements: q.statements.map((s) => ({ text: s.text, answer: s.answer }))
    })
  })
}

export function buildUpdated(question: Question, state: EditState): Question {
  return Match.value(state).pipe(
    Match.tag("mcq_single", (s) => {
      const q = question as McqSingleQuestion
      return { ...q, text: s.text, options: s.options, correct: s.correct }
    }),
    Match.tag("mcq_multi", (s) => {
      const q = question as McqMultiQuestion
      const correct = s.correct as McqMultiQuestion["correct"]
      return { ...q, text: s.text, options: s.options, correct }
    }),
    Match.tag("true_false", (s) => {
      const q = question as TrueFalseQuestion
      const statements = s.statements as TrueFalseQuestion["statements"]
      return { ...q, text: s.text, statements }
    }),
    Match.exhaustive
  )
}

export function isValidState(state: EditState): boolean {
  if (state.text.trim() === "") return false
  return Match.value(state).pipe(
    Match.tag("mcq_single", (s) => LETTERS.every((l) => s.options[l].trim() !== "")),
    Match.tag("mcq_multi", (s) => {
      const validOptions = LETTERS.every((l) => s.options[l].trim() !== "")
      const validCorrect = s.correct.length >= 2 && s.correct.length <= 3
      return validOptions && validCorrect
    }),
    Match.tag("true_false", (s) => s.statements.length >= 3 && s.statements.every((s2) => s2.text.trim() !== "")),
    Match.exhaustive
  )
}
