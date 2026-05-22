import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { TeacherExamApi } from '../definition'

export const HealthLive = HttpApiBuilder.group(TeacherExamApi, 'health', (handlers) =>
  handlers.handle('getHealth', () =>
    Effect.succeed({
      status: 'ok',
      service: 'teacher-exam-api',
      timestamp: new Date().toISOString(),
    }),
  ),
)
