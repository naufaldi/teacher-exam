import { Hono } from 'hono'
import { Effect, Either, Schema, Match } from 'effect'
import { db, exams, questions } from '@teacher-exam/db'
import {
  GenerateExamInputSchema,
  normalizeExamType,
  formatExamTitle,
  SUBJECT_LABEL,
  FigureSpecSchema,
} from '@teacher-exam/shared'
import type { FigureSpec, GeneratedQuestion, Question } from '@teacher-exam/shared'
import { getCurriculumText } from '../lib/curriculum'
import { logAiEvent } from '../lib/ai-log'
import { EXAM_TYPE_PROFILE, resolveComposition } from '../lib/exam-type-profile'
import { buildExamPrompt } from '../lib/prompt'
import { fetchExamWithQuestions } from '../lib/exams-query'
import { questionToRow } from '../lib/question-mapper'
import { validateGeneratedQuestionLatex, type LatexValidationResult } from '../lib/latex-validator'
import {
  createDefaultAiService,
  type AiService,
} from '../services/AiService'
import type { AiGenerationError } from '../errors'

type GenerationValidationResult = {
  questions: ReadonlyArray<GeneratedQuestion>
  latexResults: ReadonlyArray<LatexValidationResult>
}

function convertGeneratedToQuestion(
  q: GeneratedQuestion,
  meta: { id: string; examId: string; number: number; status: 'accepted' | 'pending'; createdAt: Date },
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

async function generateWithLatexValidation(
  aiService: AiService,
  request: { system: string; user: string; expectedCount: number; shouldValidateLatex: boolean },
): Promise<Either.Either<GenerationValidationResult, AiGenerationError>> {
  const maxAttempts = request.shouldValidateLatex ? 3 : 1
  let lastInvalid:
    | {
      questions: ReadonlyArray<GeneratedQuestion>
      latexResults: ReadonlyArray<LatexValidationResult>
    }
    | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const generated = await Effect.runPromise(
      Effect.either(aiService.generate({
        system: request.system,
        user: request.user,
        expectedCount: request.expectedCount,
      })),
    )
    if (Either.isLeft(generated)) return Either.left(generated.left)

    const latexResults = request.shouldValidateLatex
      ? generated.right.map((question) => validateGeneratedQuestionLatex(question))
      : generated.right.map((): LatexValidationResult => ({ _tag: 'valid' }))

    const hasInvalidLatex = latexResults.some((result) => result._tag === 'invalid')
    if (!hasInvalidLatex) return Either.right({ questions: generated.right, latexResults })

    lastInvalid = { questions: generated.right, latexResults }
  }

  return Either.right(lastInvalid ?? { questions: [], latexResults: [] })
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

/**
 * Build the `/api/ai` router. Accepts an injected `AiService` for tests; in
 * production the default service (`createDefaultAiService`, from `AI_PROVIDER` + keys) is created lazily.
 */
export function createAiRouter(opts: { aiService?: AiService } = {}): Hono {
  const router = new Hono()
  let aiService = opts.aiService

  router.post('/generate', async (c) => {
    const userId = c.get('userId') as string | undefined
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json().catch(() => null)
    if (body === null) return c.json({ error: 'Invalid JSON body' }, 400)

    const decode = Schema.decodeUnknownEither(GenerateExamInputSchema)
    const parsed = decode(body)
    if (parsed._tag === 'Left') {
      return c.json(
        { error: 'Validation failed', details: String(parsed.left) },
        400,
      )
    }
    const input = parsed.right

    const examType = normalizeExamType(input.examType ?? 'formatif')
    const totalSoal = input.totalSoal ?? EXAM_TYPE_PROFILE[examType].defaultTotalSoal

    let composition: ReturnType<typeof resolveComposition>
    try {
      composition = resolveComposition(examType, totalSoal, input.composition)
    } catch (err) {
      return c.json({ error: 'Validation failed', details: (err as Error).message }, 400)
    }

    const curriculumText = await getCurriculumText(input.subject, input.grade)
    const { system, user } = buildExamPrompt({
      examType,
      difficulty: input.difficulty,
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      topics: [...input.topics],
      totalSoal,
      composition,
      curriculumText,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions,
    })

    aiService ??= createDefaultAiService()

    const generated = await generateWithLatexValidation(aiService, {
      system,
      user,
      expectedCount: totalSoal,
      shouldValidateLatex: input.subject === 'matematika',
    })
    if (Either.isLeft(generated)) {
      const err = generated.left
      logAiEvent('api.ai.generate', 'warn', {
        path: '/api/ai/generate',
        message: String((err as { cause?: unknown }).cause),
      })
      return c.json({ error: 'AI generation failed', message: String((err as { cause?: unknown }).cause) }, 502)
    }
    const generatedQuestions = generated.right.questions
    const latexResults = generated.right.latexResults

    const title = formatExamTitle({
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      examType,
      examDate: null,
      topics: [...input.topics],
    })
    const examId = crypto.randomUUID()
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(exams).values({
        id:          examId,
        userId,
        title,
        subject:     input.subject,
        grade:       input.grade,
        difficulty:  input.difficulty,
        topics:      [...input.topics],
        reviewMode:  input.reviewMode,
        status:      'draft',
        examType,
        classContext: input.classContext ?? null,
        createdAt:   now,
        updatedAt:   now,
      })

      await tx.insert(questions).values(
        generatedQuestions.map((q, i) => {
          const dbQuestion = convertGeneratedToQuestion(
            q,
            {
              id: crypto.randomUUID(),
              examId,
              number: i + 1,
              status: input.reviewMode === 'fast' ? 'accepted' : 'pending',
              createdAt: now,
            },
            latexResults[i],
          )
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
      )
    })

    const result = await fetchExamWithQuestions(examId)
    if (!result) {
      return c.json({ error: 'Failed to retrieve generated exam', code: 'DATABASE_ERROR' }, 500)
    }

    return c.json(result, 201)
  })

  return router
}
