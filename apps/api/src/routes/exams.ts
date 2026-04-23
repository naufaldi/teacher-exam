import { Hono } from 'hono'
import { Schema } from 'effect'
import { eq, and, desc } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { UpdateExamInputSchema, normalizeExamType } from '@teacher-exam/shared'
import type { Exam, ExamWithQuestions, Question } from '@teacher-exam/shared'
import type { InferSelectModel } from 'drizzle-orm'

type ExamRow = InferSelectModel<typeof exams>
type QuestionRow = InferSelectModel<typeof questions>

function toExam(row: ExamRow): Exam {
  return {
    id:              row.id,
    userId:          row.userId,
    title:           row.title,
    subject:         row.subject,
    grade:           row.grade,
    difficulty:      row.difficulty,
    topic:           row.topic,
    reviewMode:      row.reviewMode,
    status:          row.status,
    schoolName:      row.schoolName ?? null,
    academicYear:    row.academicYear ?? null,
    examType:        normalizeExamType(row.examType),
    examDate:        row.examDate ?? null,
    durationMinutes: row.durationMinutes ?? null,
    instructions:    row.instructions ?? null,
    classContext:    row.classContext ?? null,
    discussionMd:    row.discussionMd ?? null,
    createdAt:       row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:       row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

function toQuestion(row: QuestionRow): Question {
  return {
    id:               row.id,
    examId:           row.examId,
    number:           row.number,
    text:             row.text,
    optionA:          row.optionA,
    optionB:          row.optionB,
    optionC:          row.optionC,
    optionD:          row.optionD,
    correctAnswer:    row.correctAnswer,
    topic:            row.topic ?? null,
    difficulty:       row.difficulty ?? null,
    status:           row.status,
    validationStatus: row.validationStatus as Question['validationStatus'] ?? null,
    validationReason: row.validationReason ?? null,
    createdAt:        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }
}

async function fetchExamWithQuestions(examId: string): Promise<ExamWithQuestions | null> {
  const examRows = await db.select().from(exams).where(eq(exams.id, examId)).limit(1)
  const examRow = examRows[0]
  if (!examRow) return null

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.number)

  return { ...toExam(examRow), questions: questionRows.map((q) => toQuestion(q)) }
}

export const examsRouter = new Hono()

// GET / — list all exams for the authenticated user
examsRouter.get('/', async (c) => {
  const userId = c.get('userId')

  const rows = await db
    .select()
    .from(exams)
    .where(eq(exams.userId, userId))
    .orderBy(desc(exams.createdAt))

  return c.json(rows.map((r) => toExam(r)))
})

// GET /:id — get single exam with questions
examsRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const examRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  const examRow = examRows[0]
  if (!examRow) return c.json({ error: 'Exam not found', code: 'NOT_FOUND' }, 404)

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, id))
    .orderBy(questions.number)

  const result: ExamWithQuestions = {
    ...toExam(examRow),
    questions: questionRows.map((q) => toQuestion(q)),
  }

  return c.json(result)
})

// PATCH /:id — update exam fields
examsRouter.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const body = await c.req.json().catch(() => null)
  if (body === null) return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)

  const decode = Schema.decodeUnknownEither(UpdateExamInputSchema)
  const parsed = decode(body)
  if (parsed._tag === 'Left') {
    return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: String(parsed.left) }, 422)
  }
  const input = parsed.right

  // Ownership check
  const examRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  if (!examRows[0]) return c.json({ error: 'Exam not found', code: 'NOT_FOUND' }, 404)

  // Build update object with only defined fields
  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (input.title !== undefined) updateData['title'] = input.title
  if (input.schoolName !== undefined) updateData['schoolName'] = input.schoolName
  if (input.academicYear !== undefined) updateData['academicYear'] = input.academicYear
  if (input.examType !== undefined) updateData['examType'] = input.examType
  if (input.examDate !== undefined) updateData['examDate'] = input.examDate
  if (input.durationMinutes !== undefined) updateData['durationMinutes'] = input.durationMinutes
  if (input.instructions !== undefined) updateData['instructions'] = input.instructions
  if (input.classContext !== undefined) updateData['classContext'] = input.classContext
  if (input.status !== undefined) updateData['status'] = input.status
  if (input.reviewMode !== undefined) updateData['reviewMode'] = input.reviewMode

  await db.update(exams).set(updateData).where(and(eq(exams.id, id), eq(exams.userId, userId)))

  // Re-fetch updated exam with questions
  const updatedRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  const updatedRow = updatedRows[0]
  if (!updatedRow) return c.json({ error: 'Exam not found', code: 'NOT_FOUND' }, 404)

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, id))
    .orderBy(questions.number)

  const result: ExamWithQuestions = {
    ...toExam(updatedRow),
    questions: questionRows.map((q) => toQuestion(q)),
  }

  return c.json(result)
})

// DELETE /:id — delete exam (questions cascade via FK)
examsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const examRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  if (!examRows[0]) return c.json({ error: 'Exam not found', code: 'NOT_FOUND' }, 404)

  await db.delete(exams).where(and(eq(exams.id, id), eq(exams.userId, userId)))

  return new Response(null, { status: 204 })
})

// POST /:id/duplicate — clone exam and its questions
examsRouter.post('/:id/duplicate', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  // Ownership check
  const examRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  const examRow = examRows[0]
  if (!examRow) return c.json({ error: 'Exam not found', code: 'NOT_FOUND' }, 404)

  // Fetch source questions
  const sourceQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, id))
    .orderBy(questions.number)

  const now = new Date()
  const newExamId = crypto.randomUUID()

  // Insert new exam
  await db.insert(exams).values({
    id:              newExamId,
    userId:          examRow.userId,
    title:           examRow.title,
    subject:         examRow.subject,
    grade:           examRow.grade,
    difficulty:      examRow.difficulty,
    topic:           examRow.topic,
    reviewMode:      examRow.reviewMode,
    status:          'draft',
    schoolName:      examRow.schoolName,
    academicYear:    examRow.academicYear,
    examType:        examRow.examType,
    examDate:        examRow.examDate,
    durationMinutes: examRow.durationMinutes,
    instructions:    examRow.instructions,
    classContext:    examRow.classContext,
    discussionMd:    examRow.discussionMd,
    createdAt:       now,
    updatedAt:       now,
  })

  // Insert cloned questions
  if (sourceQuestions.length > 0) {
    await db.insert(questions).values(
      sourceQuestions.map((q) => ({
        id:               crypto.randomUUID(),
        examId:           newExamId,
        number:           q.number,
        text:             q.text,
        optionA:          q.optionA,
        optionB:          q.optionB,
        optionC:          q.optionC,
        optionD:          q.optionD,
        correctAnswer:    q.correctAnswer,
        topic:            q.topic,
        difficulty:       q.difficulty,
        status:           q.status,
        validationStatus: q.validationStatus,
        validationReason: q.validationReason,
        createdAt:        now,
      })),
    )
  }

  // Fetch the newly created exam with questions
  const newExamWithQuestions = await fetchExamWithQuestions(newExamId)
  if (!newExamWithQuestions) {
    return c.json({ error: 'Failed to retrieve duplicated exam', code: 'DATABASE_ERROR' }, 500)
  }

  return c.json(newExamWithQuestions, 201)
})
