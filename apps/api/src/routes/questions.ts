import { Hono } from 'hono'
import { Schema } from 'effect'
import { eq, and } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { UpdateQuestionInputSchema, type UpdateQuestionInput } from '@teacher-exam/shared'
import { rowToQuestion } from '../lib/question-mapper'

export const questionsRouter = new Hono()

// PATCH /:id — update one question (ownership enforced via parent exam)
questionsRouter.patch('/:id', async (c) => {
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
  return c.json(rowToQuestion(updated))
})
