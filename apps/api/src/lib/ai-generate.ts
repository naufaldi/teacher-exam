import { Effect, Either, Schema, Match } from 'effect'
import { SqlClient } from '@effect/sql/SqlClient'
import { exams, questions } from '@teacher-exam/db'
import {
  normalizeExamType,
  formatExamTitle,
  SUBJECT_LABEL,
  FigureSpecSchema,
} from '@teacher-exam/shared'
import type { FigureSpec, GeneratedQuestion, Question } from '@teacher-exam/shared'
import type { GenerateExamInput } from '@teacher-exam/shared'
import { getCurriculumText } from './curriculum'
import { logAiEvent } from './ai-log'
import { EXAM_TYPE_PROFILE, resolveComposition } from './exam-type-profile'
import { buildExamPrompt } from './prompt'
import { fetchExamWithQuestions } from './exams-query'
import { questionToRow } from './question-mapper'
import { validateGeneratedQuestionLatex, type LatexValidationResult } from './latex-validator'
import { type AiService } from '../services/AiService'
import { AiGenerationError } from '../errors'
import { ApiDatabaseError } from '../api/errors/http'
import { parseGeneratedQuestions, type ParsedItemFailure } from './parse-generated-questions'
import { EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE, isExamSubjectEnumMismatch } from './db-errors'
import { normalizeGeneratedQuestionLatexFields, normalizeMatematikaLatexField } from './normalize-matematika-latex.js'
import { DbClient } from '../api/services/db'
import { runDb } from '../api/lib/db-effect'

const PLACEHOLDER_STUB_TEXT =
  'Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang.'

function makeFakeQuestionShape(number: number): GeneratedQuestion {
  return {
    _tag: 'mcq_single',
    number,
    text: `Soal simulasi ${number}`,
    option_a: 'A',
    option_b: 'B',
    option_c: 'C',
    option_d: 'D',
    correct_answer: 'a',
    topic: 'Simulasi',
    difficulty: 'mudah',
  }
}

type SalvageGenerationResult = {
  questions: ReadonlyArray<Question>
  generationIncomplete: boolean
  failedQuestionNumbers: ReadonlyArray<number>
}

function convertGeneratedToQuestion(
  q: GeneratedQuestion,
  meta: {
    id: string
    examId: string
    number: number
    status: 'accepted' | 'pending'
    createdAt: Date
    generationFailed?: boolean
  },
  latexResult: LatexValidationResult = { _tag: 'valid' },
): Question {
  const figureResult = decodeGeneratedFigure(q.figure)
  const latexReason = latexResult._tag === 'invalid'
    ? `LaTeX validation failed: ${latexResult.reason}`
    : null
  const validationReasons = [figureResult.reason, latexReason].filter((reason): reason is string => reason !== null)
  const common = {
    id: meta.id,
    examId: meta.examId,
    number: meta.number,
    text: q.text,
    topic: q.topic ?? null,
    difficulty: q.difficulty ?? null,
    status: meta.status,
    validationStatus: validationReasons.length > 0 ? 'needs_review' as const : null,
    validationReason: validationReasons.length > 0 ? validationReasons.join('\n') : null,
    ...(meta.generationFailed === true ? { generationFailed: true as const } : {}),
    figure: figureResult.figure,
    createdAt: meta.createdAt.toISOString(),
  }
  const result = Match.value(q).pipe(
    Match.tag('mcq_single', (x) => ({
      ...common,
      _tag: 'mcq_single' as const,
      options: { a: x.option_a, b: x.option_b, c: x.option_c, d: x.option_d },
      correct: x.correct_answer,
    })),
    Match.tag('mcq_multi', (x) => ({
      ...common,
      _tag: 'mcq_multi' as const,
      options: { a: x.option_a, b: x.option_b, c: x.option_c, d: x.option_d },
      correct: x.correct_answers,
    })),
    Match.tag('true_false', (x) => ({
      ...common,
      _tag: 'true_false' as const,
      statements: x.statements.map((s) => ({ text: s.text, answer: s.answer === 'B' })),
    })),
    Match.exhaustive,
  )
  return result
}

function failureReasonForNumber(
  number: number,
  failed: ReadonlyArray<ParsedItemFailure>,
  missingNumbers: ReadonlyArray<number>,
): string {
  const failAtNumber = failed.find((f) => f.index + 1 === number)
  if (failAtNumber) return failAtNumber.error
  if (missingNumbers.includes(number)) return 'Soal tidak ada dalam output AI.'
  return 'Soal gagal divalidasi.'
}

function makePlaceholderQuestion(
  examId: string,
  number: number,
  createdAt: Date,
  reason: string,
): Question {
  return {
    id: crypto.randomUUID(),
    examId,
    number,
    text: PLACEHOLDER_STUB_TEXT,
    topic: null,
    difficulty: null,
    status: 'pending',
    validationStatus: 'needs_review',
    validationReason: reason,
    generationFailed: true,
    _tag: 'mcq_single',
    options: { a: '—', b: '—', c: '—', d: '—' },
    correct: 'a',
    createdAt: createdAt.toISOString(),
  }
}

async function generateWithSalvage(
  aiService: AiService,
  request: {
    system: string
    user: string
    expectedCount: number
    shouldValidateLatex: boolean
    reviewMode: 'fast' | 'slow'
    examId: string
    createdAt: Date
  },
): Promise<Either.Either<SalvageGenerationResult, AiGenerationError>> {
  const maxAttempts = request.shouldValidateLatex ? 3 : 1
  let lastSalvage:
    | {
      valid: ReadonlyArray<GeneratedQuestion>
      failed: ReadonlyArray<ParsedItemFailure>
      missingNumbers: ReadonlyArray<number>
      latexByNumber: Map<number, LatexValidationResult>
    }
    | null = null
  let lastParseError: AiGenerationError | null = null

  const devSimulateSalvage = process.env['DEV_SIMULATE_SALVAGE'] === '1'

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rawResult = devSimulateSalvage
      ? Either.right(
          JSON.stringify(
            Array.from({ length: request.expectedCount }, (_, i) => {
              const n = i + 1
              if (n === request.expectedCount) {
                return { ...makeFakeQuestionShape(n), correct_answer: 'z' }
              }
              return makeFakeQuestionShape(n)
            }),
          ),
        )
      : await Effect.runPromise(
          Effect.either(
            aiService.generateRaw({
              system: request.system,
              user: request.user,
            }),
          ),
        )
    if (Either.isLeft(rawResult)) return Either.left(rawResult.left)

    const parsed = parseGeneratedQuestions(rawResult.right, request.expectedCount)
    if (Either.isLeft(parsed)) {
      lastParseError = parsed.left
      continue
    }

    const { valid, failed, missingNumbers } = parsed.right
    const latexByNumber = new Map<number, LatexValidationResult>()
    for (const question of valid) {
      latexByNumber.set(
        question.number,
        request.shouldValidateLatex
          ? validateGeneratedQuestionLatex(question)
          : { _tag: 'valid' },
      )
    }

    const hasInvalidLatex = [...latexByNumber.values()].some((r) => r._tag === 'invalid')
    lastSalvage = { valid, failed, missingNumbers, latexByNumber }
    if (!hasInvalidLatex) break
  }

  if (!lastSalvage) {
    if (lastParseError) return Either.left(lastParseError)
    return Either.left(new AiGenerationError({ cause: 'AI generation produced no output' }))
  }

  const validNumbers = new Set(lastSalvage.valid.map((q) => q.number))
  const failedQuestionNumbers: number[] = []
  for (let n = 1; n <= request.expectedCount; n++) {
    if (!validNumbers.has(n)) failedQuestionNumbers.push(n)
  }
  const generationIncomplete = failedQuestionNumbers.length > 0

  if (lastSalvage.valid.length === 0 && failedQuestionNumbers.length === 0) {
    return Either.left(new AiGenerationError({ cause: 'AI generation produced no valid questions' }))
  }

  logAiEvent('api.ai.generate.salvage', 'warn', {
    path: '/api/ai/generate',
    valid: lastSalvage.valid.length,
    failedItems: lastSalvage.failed.length,
    missing: lastSalvage.missingNumbers.length,
    gaps: failedQuestionNumbers.length,
  })

  const statusForValid: 'accepted' | 'pending' =
    request.reviewMode === 'fast' ? 'accepted' : 'pending'

  const byNumber = new Map<number, Question>()
  for (const q of lastSalvage.valid) {
    const latex = lastSalvage.latexByNumber.get(q.number) ?? { _tag: 'valid' as const }
    const stored = request.shouldValidateLatex ? normalizeGeneratedQuestionLatexFields(q) : q
    byNumber.set(
      q.number,
      convertGeneratedToQuestion(
        stored,
        {
          id: crypto.randomUUID(),
          examId: request.examId,
          number: q.number,
          status: statusForValid,
          createdAt: request.createdAt,
        },
        latex,
      ),
    )
  }

  for (const number of failedQuestionNumbers) {
    if (byNumber.has(number)) continue
    byNumber.set(
      number,
      makePlaceholderQuestion(
        request.examId,
        number,
        request.createdAt,
        failureReasonForNumber(number, lastSalvage.failed, lastSalvage.missingNumbers),
      ),
    )
  }

  const questions: Question[] = []
  for (let n = 1; n <= request.expectedCount; n++) {
    const row = byNumber.get(n)
    if (row) questions.push(row)
  }

  return Either.right({
    questions,
    generationIncomplete,
    failedQuestionNumbers,
  })
}

function decodeGeneratedFigure(raw: unknown): {
  figure: FigureSpec | null
  status: 'needs_review' | null
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
    status: 'needs_review',
    reason: `FigureSpec validation failed; diagram was removed: ${String(decoded.left)}`,
  }
}

export type GenerateExamResult =
  | { readonly _tag: 'success'; readonly body: Record<string, unknown>; readonly status: 201 }
  | { readonly _tag: 'ai_error'; readonly message: string }
  | { readonly _tag: 'database_error'; readonly message: string }
  | { readonly _tag: 'validation_error'; readonly details: string }

export function generateExam(
  userId: string,
  input: GenerateExamInput,
  aiService: AiService,
): Effect.Effect<GenerateExamResult, AiGenerationError | ApiDatabaseError, DbClient | SqlClient> {
  return Effect.gen(function* () {
    const handlerT0 = Date.now()
    const examType = normalizeExamType(input.examType ?? 'formatif')
    const totalSoal = input.totalSoal ?? EXAM_TYPE_PROFILE[examType].defaultTotalSoal

    let composition: ReturnType<typeof resolveComposition>
    try {
      composition = resolveComposition(examType, totalSoal, input.composition)
    } catch (err) {
      return { _tag: 'validation_error', details: (err as Error).message }
    }

    const curriculumText = yield* Effect.tryPromise({
      try: () => getCurriculumText(input.subject, input.grade),
      catch: (cause) => cause,
    }).pipe(Effect.orDie)
    const { system, user } = buildExamPrompt({
      examType,
      difficulty: input.difficulty,
      examSubject: input.subject,
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      topics: [...input.topics],
      totalSoal,
      composition,
      curriculumText,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions,
    })

    const title = formatExamTitle({
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      examType,
      examDate: null,
      topics: [...input.topics],
    })
    const examId = crypto.randomUUID()
    const now = new Date()

    const generated = yield* Effect.tryPromise({
      try: () =>
        generateWithSalvage(aiService, {
          system,
          user,
          expectedCount: totalSoal,
          shouldValidateLatex: input.subject === 'matematika',
          reviewMode: input.reviewMode,
          examId,
          createdAt: now,
        }),
      catch: (cause) => new AiGenerationError({ cause }),
    })
    if (Either.isLeft(generated)) {
      const err = generated.left
      logAiEvent('api.ai.generate', 'warn', {
        path: '/api/ai/generate',
        message: String((err as { cause?: unknown }).cause),
      })
      return { _tag: 'ai_error', message: String((err as { cause?: unknown }).cause) }
    }

    const insertedQuestions = [...generated.right.questions]
    const generationIncomplete = generated.right.generationIncomplete
    const failedQuestionNumbers = [...generated.right.failedQuestionNumbers]

    const db = yield* DbClient
    const sql = yield* SqlClient

    const insertTransaction = sql.withTransaction(
      Effect.gen(function* () {
        yield* runDb(
          db.insert(exams).values({
            id: examId,
            userId,
            title,
            subject: input.subject,
            grade: input.grade,
            difficulty: input.difficulty,
            topics: [...input.topics],
            reviewMode: input.reviewMode,
            status: 'draft',
            examType,
            classContext: input.classContext ?? null,
            createdAt: now,
            updatedAt: now,
          }),
        )

        yield* runDb(
          db.insert(questions).values(
            insertedQuestions.map((dbQuestion) => {
              const rowFields = questionToRow(dbQuestion)
              return {
                id: dbQuestion.id,
                examId: dbQuestion.examId,
                number: dbQuestion.number,
                text: dbQuestion.text,
                topic: dbQuestion.topic,
                difficulty: dbQuestion.difficulty,
                status: dbQuestion.status,
                validationStatus: dbQuestion.validationStatus,
                validationReason: dbQuestion.validationReason,
                createdAt: now,
                type: rowFields.type,
                optionA: rowFields.optionA,
                optionB: rowFields.optionB,
                optionC: rowFields.optionC,
                optionD: rowFields.optionD,
                correctAnswer: rowFields.correctAnswer,
                payload: rowFields.payload,
              }
            }),
          ),
        )
      }),
    )

    const insertResult = yield* Effect.either(insertTransaction)
    if (insertResult._tag === 'Left') {
      const err = insertResult.left
      if (isExamSubjectEnumMismatch(err)) {
        return { _tag: 'database_error', message: EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE }
      }
      return {
        _tag: 'database_error',
        message: err instanceof Error ? err.message : 'Database error',
      }
    }

    const result = yield* fetchExamWithQuestions(examId)
    if (!result) {
      return { _tag: 'database_error', message: 'Failed to retrieve generated exam' }
    }

    logAiEvent('api.ai.generate', 'info', {
      path: '/api/ai/generate',
      examId,
      questionCount: insertedQuestions.length,
      durationMs: Date.now() - handlerT0,
    })

    return {
      _tag: 'success',
      status: 201,
      body: {
        ...result,
        ...(generationIncomplete ? { generationIncomplete: true, failedQuestionNumbers } : {}),
      },
    }
  })
}
