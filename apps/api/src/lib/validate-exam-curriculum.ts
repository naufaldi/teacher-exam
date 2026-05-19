import { eq } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import type { ExamSubject, ExamWithQuestions } from '@teacher-exam/shared'
import { getCurriculumText } from './curriculum'
import { fetchExamWithQuestions } from './exams-query'
import { rowToQuestion } from './question-mapper'
import { logAiEvent } from './ai-log'
import type { AiService } from '../services/AiService'
import { validateQuestionBatch } from '../services/ValidatorService'

export async function validateExamCurriculum(
  examId: string,
  userId: string,
  aiService: AiService,
): Promise<ExamWithQuestions | null> {
  const t0 = Date.now()
  const examRows = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1)

  const examRow = examRows[0]
  if (!examRow || examRow.userId !== userId) return null

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.number)

  const dbQuestions = questionRows.map((q) => rowToQuestion(q))
  const questionsForCurriculum = dbQuestions.filter((q) => q.generationFailed !== true)

  if (questionsForCurriculum.length === 0) {
    return fetchExamWithQuestions(examId)
  }

  const curriculumText = await getCurriculumText(
    examRow.subject as ExamSubject,
    examRow.grade,
  )

  const validationUpdates = await validateQuestionBatch({
    aiService,
    exam: {
      subject: examRow.subject,
      grade: examRow.grade,
      examType: examRow.examType ?? 'formatif',
    },
    curriculumText,
    questions: questionsForCurriculum,
  })

  for (const update of validationUpdates) {
    await db
      .update(questions)
      .set({
        validationStatus: update.validationStatus,
        validationReason: update.validationReason,
      })
      .where(eq(questions.id, update.id))
  }

  logAiEvent('api.exams.validate-curriculum', 'info', {
    examId,
    questionCount: questionsForCurriculum.length,
    durationMs: Date.now() - t0,
  })

  return fetchExamWithQuestions(examId)
}
