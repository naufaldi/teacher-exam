import { ExamIdSchema, FigureSpecSchema, QuestionIdSchema, SUBJECT_LABEL } from "@teacher-exam/shared"
import type { ExamSubject, FigureSpec, GeneratedQuestion, GenerateExamInput, Question } from "@teacher-exam/shared"
import { Either, Match, Schema } from "effect"
import type { LatexValidationResult } from "./latex-validator"
import type { ParsedItemFailure } from "./parse-generated-questions"

export const PLACEHOLDER_STUB_TEXT = "Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang."

export function resolveInputSubjectLabel(input: GenerateExamInput): string {
  const custom = input.subjectLabel?.trim()
  if (custom) return custom
  if (input.subject) return SUBJECT_LABEL[input.subject]
  return "Mata Pelajaran"
}

export function examSubjectInsertFields(
  sourceMode: NonNullable<GenerateExamInput["sourceMode"]> | "default",
  input: GenerateExamInput
): { subject: ExamSubject | null; subjectLabel: string | null } {
  if (sourceMode === "pdf_guru") {
    return {
      subject: null,
      subjectLabel: input.subjectLabel?.trim() ?? null
    }
  }
  return {
    subject: input.subject ?? null,
    subjectLabel: null
  }
}

export function makeFakeQuestionShape(number: number): GeneratedQuestion {
  return {
    _tag: "mcq_single",
    number,
    text: `Soal simulasi ${number}`,
    option_a: "A",
    option_b: "B",
    option_c: "C",
    option_d: "D",
    correct_answer: "a",
    topic: "Simulasi",
    difficulty: "mudah"
  }
}

export function decodeGeneratedFigure(raw: unknown): {
  figure: FigureSpec | null
  status: "needs_review" | null
  reason: string | null
} {
  if (raw === undefined || raw === null) {
    return { figure: null, status: null, reason: null }
  }

  const decoded = Schema.decodeUnknownEither(FigureSpecSchema)(raw)
  if (Either.isRight(decoded)) {
    return { figure: decoded.right, status: null, reason: null }
  }

  return {
    figure: null,
    status: "needs_review",
    reason: `FigureSpec validation failed; diagram was removed: ${String(decoded.left)}`
  }
}

export function convertGeneratedToQuestion(
  q: GeneratedQuestion,
  meta: {
    id: string
    examId: string
    number: number
    status: "accepted" | "pending"
    createdAt: Date
    generationFailed?: boolean
  },
  latexResult: LatexValidationResult = { _tag: "valid" }
): Question {
  const figureResult = decodeGeneratedFigure(q.figure)
  const latexReason = latexResult._tag === "invalid"
    ? `LaTeX validation failed: ${latexResult.reason}`
    : null
  const validationReasons = [figureResult.reason, latexReason].filter((reason): reason is string => reason !== null)
  const common = {
    id: Schema.decodeSync(QuestionIdSchema)(meta.id),
    examId: Schema.decodeSync(ExamIdSchema)(meta.examId),
    number: meta.number,
    text: q.text,
    topic: q.topic ?? null,
    difficulty: q.difficulty ?? null,
    status: meta.status,
    validationStatus: validationReasons.length > 0 ? "needs_review" as const : null,
    validationReason: validationReasons.length > 0 ? validationReasons.join("\n") : null,
    ...(meta.generationFailed === true ? { generationFailed: true as const } : {}),
    figure: figureResult.figure,
    createdAt: meta.createdAt.toISOString()
  }
  const result = Match.value(q).pipe(
    Match.tag("mcq_single", (x) => ({
      ...common,
      _tag: "mcq_single" as const,
      options: { a: x.option_a, b: x.option_b, c: x.option_c, d: x.option_d },
      correct: x.correct_answer
    })),
    Match.tag("mcq_multi", (x) => ({
      ...common,
      _tag: "mcq_multi" as const,
      options: { a: x.option_a, b: x.option_b, c: x.option_c, d: x.option_d },
      correct: x.correct_answers
    })),
    Match.tag("true_false", (x) => ({
      ...common,
      _tag: "true_false" as const,
      statements: x.statements.map((s) => ({ text: s.text, answer: s.answer === "B" }))
    })),
    Match.exhaustive
  )
  return result
}

export function failureReasonForNumber(
  number: number,
  failed: ReadonlyArray<ParsedItemFailure>,
  missingNumbers: ReadonlyArray<number>
): string {
  const failAtNumber = failed.find((f) => f.index + 1 === number)
  if (failAtNumber) return failAtNumber.error
  if (missingNumbers.includes(number)) return "Soal tidak ada dalam output AI."
  return "Soal gagal divalidasi."
}

export function makePlaceholderQuestion(
  examId: string,
  number: number,
  createdAt: Date,
  reason: string
): Question {
  return {
    id: Schema.decodeSync(QuestionIdSchema)(crypto.randomUUID()),
    examId: Schema.decodeSync(ExamIdSchema)(examId),
    number,
    text: PLACEHOLDER_STUB_TEXT,
    topic: null,
    difficulty: null,
    status: "pending",
    validationStatus: "needs_review",
    validationReason: reason,
    generationFailed: true,
    _tag: "mcq_single",
    options: { a: "—", b: "—", c: "—", d: "—" },
    correct: "a",
    createdAt: createdAt.toISOString()
  }
}
