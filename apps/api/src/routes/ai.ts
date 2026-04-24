import { Hono } from 'hono'
import { Schema } from 'effect'
import { db, exams, questions } from '@teacher-exam/db'
import {
  GenerateExamInputSchema,
  normalizeExamType,
  formatExamTitle,
  SUBJECT_LABEL,
} from '@teacher-exam/shared'
import { getCurriculumText } from '../lib/curriculum'
import { buildExamPrompt } from '../lib/prompt'
import { fetchExamWithQuestions } from '../lib/exams-query'
import {
  AiGenerationError,
  createDefaultAiService,
  type AiService,
  type GeneratedQuestion,
} from '../services/AiService'

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
    const curriculumText = await getCurriculumText(input.subject, input.grade)
    const { system, user } = buildExamPrompt({
      examType,
      difficulty: input.difficulty,
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      topics: [...input.topics],
      curriculumText,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions,
    })

    aiService ??= createDefaultAiService()

    let generatedQuestions: ReadonlyArray<GeneratedQuestion>
    try {
      generatedQuestions = await aiService.generate({ system, user })
    } catch (err) {
      if (err instanceof AiGenerationError) {
        return c.json({ error: 'AI generation failed', message: err.message }, 502)
      }
      throw err
    }

    if (generatedQuestions.length !== 20) {
      return c.json(
        { error: 'AI generation failed', message: `Expected 20 questions, got ${generatedQuestions.length}` },
        502,
      )
    }

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
        generatedQuestions.map((q, i) => ({
          id:            crypto.randomUUID(),
          examId,
          number:        i + 1,
          text:          q.text,
          optionA:       q.option_a,
          optionB:       q.option_b,
          optionC:       q.option_c,
          optionD:       q.option_d,
          correctAnswer: q.correct_answer,
          topic:         q.topic ?? null,
          difficulty:    q.difficulty ?? null,
          status:        (input.reviewMode === 'fast' ? 'accepted' : 'pending') as 'accepted' | 'pending',
          createdAt:     now,
        })),
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
