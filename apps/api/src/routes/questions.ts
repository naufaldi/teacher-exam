import { Hono } from 'hono'
import { Effect, Either, Schema, Match } from 'effect'
import { eq, and, ne } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { UpdateQuestionInputSchema, RegenerateQuestionInputSchema } from '@teacher-exam/shared'
import type { McqSingleQuestion, McqMultiQuestion, TrueFalseQuestion, GeneratedQuestion } from '@teacher-exam/shared'
import { rowToQuestion, questionToRow } from '../lib/question-mapper'
import {
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

    // Check that at least one field is being updated
    const hasChanges =
      input.text !== undefined ||
      input.status !== undefined ||
      ('options' in input && input.options !== undefined) ||
      ('correct' in input && input.correct !== undefined) ||
      ('statements' in input && input.statements !== undefined)

    if (!hasChanges) {
      return c.json({ error: 'No fields to update', code: 'VALIDATION_ERROR' }, 422)
    }

    // Ownership check
    const ownerRows = await db
      .select({ questionId: questions.id, examUserId: exams.userId })
      .from(questions)
      .innerJoin(exams, eq(questions.examId, exams.id))
      .where(and(eq(questions.id, id), eq(exams.userId, userId)))
      .limit(1)

    if (!ownerRows[0]) return c.json({ error: 'Question not found', code: 'NOT_FOUND' }, 404)

    // Fetch full existing row
    const existingRows = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1)

    if (!existingRows[0]) return c.json({ error: 'Question not found', code: 'NOT_FOUND' }, 404)

    const existingQuestion = rowToQuestion(existingRows[0])

    // Determine effective tag: input._tag overrides only if present
    const inputTag = '_tag' in input ? input._tag : undefined
    const effectiveTag = inputTag ?? existingQuestion._tag

    // Build merged typed Question object
    const mergedQuestion = Match.value(effectiveTag).pipe(
      Match.when('mcq_single', () => {
        const base = existingQuestion._tag === 'mcq_single'
          ? existingQuestion
          : { options: { a: '', b: '', c: '', d: '' }, correct: 'a' as const }
        const inputOptions = 'options' in input ? input.options : undefined
        const inputCorrect = 'correct' in input ? input.correct : undefined
        const merged: McqSingleQuestion = {
          ...existingQuestion,
          _tag: 'mcq_single',
          options: inputOptions ?? (base as McqSingleQuestion).options,
          correct: (inputCorrect as McqSingleQuestion['correct']) ?? (base as McqSingleQuestion).correct,
          text: input.text ?? existingQuestion.text,
          status: input.status ?? existingQuestion.status,
        }
        return merged
      }),
      Match.when('mcq_multi', () => {
        const base = existingQuestion._tag === 'mcq_multi'
          ? existingQuestion
          : { options: { a: '', b: '', c: '', d: '' }, correct: [] as McqMultiQuestion['correct'] }
        const inputOptions = 'options' in input ? input.options : undefined
        const inputCorrect = 'correct' in input ? input.correct : undefined
        const merged: McqMultiQuestion = {
          ...existingQuestion,
          _tag: 'mcq_multi',
          options: inputOptions ?? (base as McqMultiQuestion).options,
          correct: (inputCorrect as McqMultiQuestion['correct']) ?? (base as McqMultiQuestion).correct,
          text: input.text ?? existingQuestion.text,
          status: input.status ?? existingQuestion.status,
        }
        return merged
      }),
      Match.when('true_false', () => {
        const base = existingQuestion._tag === 'true_false'
          ? existingQuestion
          : { statements: [] as TrueFalseQuestion['statements'] }
        const inputStatements = 'statements' in input ? input.statements : undefined
        const merged: TrueFalseQuestion = {
          ...existingQuestion,
          _tag: 'true_false',
          statements: (inputStatements as TrueFalseQuestion['statements']) ?? (base as TrueFalseQuestion).statements,
          text: input.text ?? existingQuestion.text,
          status: input.status ?? existingQuestion.status,
        }
        return merged
      }),
      Match.orElse(() => existingQuestion),
    )

    // Convert to DB columns
    const typeCols = questionToRow(mergedQuestion)

    const updateData: Record<string, unknown> = {
      type:          typeCols.type,
      optionA:       typeCols.optionA,
      optionB:       typeCols.optionB,
      optionC:       typeCols.optionC,
      optionD:       typeCols.optionD,
      correctAnswer: typeCols.correctAnswer,
      payload:       typeCols.payload,
    }
    if (input.text   !== undefined) updateData['text']   = input.text
    if (input.status !== undefined) updateData['status'] = input.status

    const [updated] = await db
      .update(questions)
      .set(updateData)
      .where(eq(questions.id, id))
      .returning()
    if (!updated) return c.json({ error: 'Question disappeared', code: 'DATABASE_ERROR' }, 500)
    return c.json(rowToQuestion(updated))
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

    const siblingTexts = siblingRows.map((r) => r.text)

    // Step 3: build a single-question prompt.
    // Shape MUST match `GeneratedQuestionSchema` (tagged Schema.Union in
    // packages/shared) — `_tag` is the discriminator and `number` is required.
    const system = [
      'Anda adalah generator soal ulangan SD untuk Kurikulum Merdeka.',
      'Jawab HANYA dengan JSON array berisi tepat 1 objek soal pilihan ganda — tanpa prosa, tanpa pembungkus markdown.',
      'Format wajib (semua field diperlukan):',
      '  { "_tag": "mcq_single", "number": 1, "text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "a|b|c|d", "topic": "...", "difficulty": "mudah|sedang|sulit" }',
    ].join('\n')
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

    const aiResult = await Effect.runPromise(
      Effect.either(aiService.generate({ system, user, expectedCount: 1 })),
    )
    if (Either.isLeft(aiResult)) {
      return c.json({ error: 'AI generation failed', code: 'AI_ERROR' }, 502)
    }
    const result = aiResult.right

    if (result.length === 0 || !result[0]) {
      return c.json({ error: 'AI generation failed', code: 'AI_ERROR' }, 502)
    }

    const generated = result[0]

    if (generated._tag !== 'mcq_single') {
      return c.json({ error: 'AI generation failed', code: 'AI_ERROR' }, 502)
    }

    // Step 5: update the question row (regeneration always produces mcq_single)
    const [updatedRow] = await db
      .update(questions)
      .set({
        type:          'mcq_single',
        text:          generated.text,
        optionA:       generated.option_a,
        optionB:       generated.option_b,
        optionC:       generated.option_c,
        optionD:       generated.option_d,
        correctAnswer: generated.correct_answer,
        payload:       null,
        status:        'pending' as const,
        topic:         generated.topic,
        difficulty:    generated.difficulty,
      })
      .where(eq(questions.id, id))
      .returning()

    if (!updatedRow) return c.json({ error: 'Question disappeared', code: 'DATABASE_ERROR' }, 500)

    return c.json(rowToQuestion(updatedRow))
  })

  return router
}

// backward-compat named export used by index.ts
export const questionsRouter = createQuestionsRouter()
