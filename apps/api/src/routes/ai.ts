import { Hono } from 'hono'
import { Schema, Match } from 'effect'
import { db, exams, questions } from '@teacher-exam/db'
import {
  GenerateExamInputSchema,
  normalizeExamType,
  formatExamTitle,
  SUBJECT_LABEL,
} from '@teacher-exam/shared'
import type { Question, GeneratedQuestion } from '@teacher-exam/shared'
import { getCurriculumText } from '../lib/curriculum'
import { EXAM_TYPE_PROFILE, resolveComposition } from '../lib/exam-type-profile'
import { buildExamPrompt } from '../lib/prompt'
import { fetchExamWithQuestions } from '../lib/exams-query'
import { questionToRow } from '../lib/question-mapper'
import {
  AiGenerationError,
  createDefaultAiService,
  type AiService,
} from '../services/AiService'

function convertGeneratedToQuestion(
  q: GeneratedQuestion,
  meta: { id: string; examId: string; number: number; status: 'accepted' | 'pending'; createdAt: Date },
): Question {
  const common = {
    id: meta.id,
    examId: meta.examId,
    number: meta.number,
    text: q.text,
    topic: q.topic ?? null,
    difficulty: q.difficulty ?? null,
    status: meta.status,
    validationStatus: null as null,
    validationReason: null as null,
    createdAt: meta.createdAt.toISOString(),
  }
  const mcqSingleResult = Match.value(q).pipe(
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
  return mcqSingleResult as Question
}

/**
 * Build the `/api/ai` router. Accepts an injected `AiService` for tests; in
 * production the default service (using ANTHROPIC_API_KEY) is created lazily
 * so requests don't fail at import time when the key is missing.
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
      topic: input.topic,
      totalSoal,
      composition,
      curriculumText,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions,
    })

    aiService ??= createDefaultAiService()

    let generatedQuestions: ReadonlyArray<GeneratedQuestion>
    try {
      generatedQuestions = await aiService.generate({ system, user, expectedCount: totalSoal })
    } catch (err) {
      if (err instanceof AiGenerationError) {
        return c.json({ error: 'AI generation failed', message: err.message }, 502)
      }
      throw err
    }

    const title = formatExamTitle({
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      examType,
      examDate: null,
      topic: input.topic,
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
        topic:       input.topic,
        reviewMode:  input.reviewMode,
        status:      'draft',
        examType,
        classContext: input.classContext ?? null,
        createdAt:   now,
        updatedAt:   now,
      })

      await tx.insert(questions).values(
        generatedQuestions.map((q, i) => {
          const dbQuestion = convertGeneratedToQuestion(q, {
            id: crypto.randomUUID(),
            examId,
            number: i + 1,
            status: (input.reviewMode === 'fast' ? 'accepted' : 'pending') as 'accepted' | 'pending',
            createdAt: now,
          })
          const rowFields = questionToRow(dbQuestion)
          return {
            id: dbQuestion.id,
            examId: dbQuestion.examId,
            number: dbQuestion.number,
            text: dbQuestion.text,
            topic: q.topic ?? null,
            difficulty: q.difficulty ?? null,
            status: dbQuestion.status,
            createdAt: now,
            type: rowFields.type,
            optionA: rowFields.optionA,
            optionB: rowFields.optionB,
            optionC: rowFields.optionC,
            optionD: rowFields.optionD,
            correctAnswer: rowFields.correctAnswer as 'a' | 'b' | 'c' | 'd' | null,
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
