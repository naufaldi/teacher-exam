import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { fetchPublicExamWithQuestions } from '../../lib/exams-query'
import { tryDb } from '../lib/db-effect'
import { TeacherExamApi } from '../definition'
import { ApiPublicExamNotFound } from '../errors/http'

export const PublicExamsLive = HttpApiBuilder.group(TeacherExamApi, 'publicExams', (handlers) =>
  handlers.handle('getPublicExam', ({ path }) =>
    Effect.gen(function* () {
      const exam = yield* tryDb(() => fetchPublicExamWithQuestions(path.slug))
      if (!exam) {
        return yield* Effect.fail(
          new ApiPublicExamNotFound({ error: 'Public exam not found', code: 'NOT_FOUND' }),
        )
      }
      return exam
    }),
  ),
)
