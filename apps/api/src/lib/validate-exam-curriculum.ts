import { eq } from 'drizzle-orm'
import { Effect } from 'effect'
import { exams, questions } from '@teacher-exam/db'
import type { ExamSubject, ExamWithQuestions } from '@teacher-exam/shared'
import { CurriculumService, CurriculumReadError } from '../api/services/curriculum-service'
import { fetchExamWithQuestions } from './exams-query'
import { rowToQuestion } from './question-mapper'
import { logAiEvent } from './ai-log'
import type { AiService } from '../services/AiService'
import { validateQuestionBatch } from '../services/ValidatorService'
import { DbClient } from '../api/services/db'
import { runDb } from '../api/lib/db-effect'
import { ApiDatabaseError } from '../api/errors/http'

export function validateExamCurriculum(
  examId: string,
  userId: string,
  aiService: AiService,
): Effect.Effect<ExamWithQuestions | null, ApiDatabaseError | CurriculumReadError, DbClient | CurriculumService> {
  return Effect.gen(function* () {
    const t0 = Date.now()
    const db = yield* DbClient

    const examRows = yield* runDb(
      db.select().from(exams).where(eq(exams.id, examId)).limit(1),
    )

    const examRow = examRows[0]
    if (!examRow || examRow.userId !== userId) return null

    const questionRows = yield* runDb(
      db.select().from(questions).where(eq(questions.examId, examId)).orderBy(questions.number),
    )

    const dbQuestions = questionRows.map((q) => rowToQuestion(q))
    const questionsForCurriculum = dbQuestions.filter((q) => q.generationFailed !== true)

    if (questionsForCurriculum.length === 0) {
      return yield* fetchExamWithQuestions(examId)
    }

    const curriculum = yield* CurriculumService
    const curriculumText = yield* curriculum.getText(
      examRow.subject as ExamSubject,
      examRow.grade,
    )

    const validationUpdates = yield* validateQuestionBatch({
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
      yield* runDb(
        db
          .update(questions)
          .set({
            validationStatus: update.validationStatus,
            validationReason: update.validationReason,
          })
          .where(eq(questions.id, update.id)),
      )
    }

    logAiEvent('api.exams.validate-curriculum', 'info', {
      examId,
      questionCount: questionsForCurriculum.length,
      durationMs: Date.now() - t0,
    })

    return yield* fetchExamWithQuestions(examId)
  })
}
