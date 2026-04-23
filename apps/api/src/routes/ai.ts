import { Hono } from 'hono'
import { Schema } from 'effect'
import {
  GenerateExamInputSchema,
  type ExamSubject,
  type ExamType,
} from '@teacher-exam/shared'
import { getCurriculumText } from '../lib/curriculum'
import { buildExamPrompt } from '../lib/prompt'
import {
  AiGenerationError,
  createDefaultAiService,
  type AiService,
} from '../services/AiService'

const SUBJECT_LABEL: Record<ExamSubject, string> = {
  bahasa_indonesia: 'Bahasa Indonesia',
  pendidikan_pancasila: 'Pendidikan Pancasila',
}

const DEFAULT_EXAM_TYPE: ExamType = 'formatif'

/**
 * Build the `/api/ai` router. Accepts an injected `AiService` for tests; in
 * production the default service (using ANTHROPIC_API_KEY) is created lazily
 * so requests don't fail at import time when the key is missing.
 */
export function createAiRouter(opts: { aiService?: AiService } = {}): Hono {
  const router = new Hono()
  let aiService = opts.aiService

  router.post('/generate', async (c) => {
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

    const examType = input.examType ?? DEFAULT_EXAM_TYPE
    const curriculumText = await getCurriculumText(input.subject, input.grade)
    const { system, user } = buildExamPrompt({
      examType,
      difficulty: input.difficulty,
      subjectLabel: SUBJECT_LABEL[input.subject],
      grade: input.grade,
      topic: input.topic,
      curriculumText,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions,
    })

    aiService ??= createDefaultAiService()

    try {
      const questions = await aiService.generate({ system, user })
      return c.json({ questions })
    } catch (err) {
      if (err instanceof AiGenerationError) {
        return c.json({ error: 'AI generation failed', message: err.message }, 502)
      }
      throw err
    }
  })

  return router
}
