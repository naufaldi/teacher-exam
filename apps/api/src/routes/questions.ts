import { Hono } from 'hono'
import { Schema } from 'effect'
import { eq, and, ne } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { UpdateQuestionInputSchema, RegenerateQuestionInputSchema, type UpdateQuestionInput } from '@teacher-exam/shared'
import { toQuestion } from '../lib/exams-query'
import {
  AiGenerationError,
  createDefaultAiService,
  type AiService,
} from '../services/AiService'

export interface QuestionsRouterOptions {
  aiService?: AiService
}

export function createQuestionsRouter(opts: QuestionsRouterOptions = {}): Hono {
  const router = new Hono()
  let aiService = opts.aiService

  // PATCH /:id — update one question (ownership enforced via parent exam)
  router.patch('/:id', async (c) => {
    const userId = c.get('userId')
    const { id } = c.req.param()

    const body = await c.req.json().catch(() => null)
    if (body === null) return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)

    const parsed = Schema.decodeUnknownEither(UpdateQuestionInputSchema)(body)
    if (parsed._tag === 'Left') {
      return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: String(parsed.left) }, 422)
    }
    const input = parsed.right

    const updateData: { -readonly [K in keyof UpdateQuestionInput]?: UpdateQuestionInput[K] } = {}
    if (input.text          !== undefined) updateData.text          = input.text
    if (input.optionA       !== undefined) updateData.optionA       = input.optionA
    if (input.optionB       !== undefined) updateData.optionB       = input.optionB
    if (input.optionC       !== undefined) updateData.optionC       = input.optionC
    if (input.optionD       !== undefined) updateData.optionD       = input.optionD
    if (input.correctAnswer !== undefined) updateData.correctAnswer = input.correctAnswer
    if (input.status        !== undefined) updateData.status        = input.status

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No fields to update', code: 'VALIDATION_ERROR' }, 422)
    }

    const rows = await db
      .select({ questionId: questions.id, examUserId: exams.userId })
      .from(questions)
      .innerJoin(exams, eq(questions.examId, exams.id))
      .where(and(eq(questions.id, id), eq(exams.userId, userId)))
      .limit(1)

    if (!rows[0]) return c.json({ error: 'Question not found', code: 'NOT_FOUND' }, 404)

    const [updated] = await db
      .update(questions)
      .set(updateData as Record<string, unknown>)
      .where(eq(questions.id, id))
      .returning()
    if (!updated) return c.json({ error: 'Question disappeared', code: 'DATABASE_ERROR' }, 500)
    return c.json(toQuestion(updated))
  })

  // POST /:id/regenerate — replace a single question with an AI-generated one
  router.post('/:id/regenerate', async (c) => {
    const userId = c.get('userId')
    const { id } = c.req.param()

    const body = await c.req.json().catch(() => null)
    if (body === null) return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)

    const parsed = Schema.decodeUnknownEither(RegenerateQuestionInputSchema)(body)
    if (parsed._tag === 'Left') {
      return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: String(parsed.left) }, 422)
    }
    const input = parsed.right
    const hint = input.hint

    // Step 1: ownership check + fetch question and exam
    const ownerRows = await db
      .select({
        question: questions,
        exam: exams,
      })
      .from(questions)
      .innerJoin(exams, eq(questions.examId, exams.id))
      .where(and(eq(questions.id, id), eq(exams.userId, userId)))
      .limit(1)

    if (!ownerRows[0]) return c.json({ error: 'Question not found', code: 'NOT_FOUND' }, 404)

    const { question, exam } = ownerRows[0]

    // Step 2: fetch sibling question texts for deduplication
    const siblingRows = await db
      .select({ text: questions.text })
      .from(questions)
      .where(and(eq(questions.examId, question.examId), ne(questions.id, id)))

    // Note: we intentionally get sibling texts (excluding self) by filtering in-memory
    // The mock returns [] for siblings which is fine — the prompt handles empty arrays
    const siblingTexts = siblingRows.map((r) => r.text)

    // Step 3: build a single-question prompt
    const system = 'Anda adalah generator soal ulangan SD. Jawab HANYA dengan JSON array berisi tepat 1 soal. Setiap soal: text, option_a, option_b, option_c, option_d, correct_answer (a|b|c|d), topic, difficulty (mudah|sedang|sulit).'
    const userPayload: Record<string, unknown> = {
      kelas:            exam.grade,
      mata_pelajaran:   exam.subject,
      topik:            question.topic ?? exam.topics[0] ?? exam.subject,
      kesulitan:        question.difficulty ?? exam.difficulty,
      hindari_soal_mirip: siblingTexts.slice(0, 10).map((t) => t.substring(0, 80)),
    }
    if (hint !== undefined) {
      userPayload['petunjuk_guru'] = hint
    }
    const user = JSON.stringify(userPayload, null, 2)

    // Step 4: call AI service
    aiService ??= createDefaultAiService()

    let result: ReadonlyArray<import('../services/AiService').GeneratedQuestion>
    try {
      result = await aiService.generate({ system, user, expectedCount: 1 })
    } catch {
      return c.json({ error: 'AI generation failed', code: 'AI_ERROR' }, 502)
    }

    if (result.length === 0) {
      return c.json({ error: 'AI generation failed', code: 'AI_ERROR' }, 502)
    }

    const generated = result[0]
    if (!generated) {
      return c.json({ error: 'AI generation failed', code: 'AI_ERROR' }, 502)
    }

    // Step 5: update the question row
    const [updated] = await db
      .update(questions)
      .set({
        text:          generated.text,
        optionA:       generated.option_a,
        optionB:       generated.option_b,
        optionC:       generated.option_c,
        optionD:       generated.option_d,
        correctAnswer: generated.correct_answer,
        status:        'pending' as const,
        topic:         generated.topic,
        difficulty:    generated.difficulty,
      })
      .where(eq(questions.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Question disappeared', code: 'DATABASE_ERROR' }, 500)

    return c.json(toQuestion(updated))
  })

  return router
}

// backward-compat named export used by index.ts
export const questionsRouter = createQuestionsRouter()
