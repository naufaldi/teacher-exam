import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { generateExam } from '../../lib/ai-generate'
import { TeacherExamApi } from '../definition'
import {
  ApiAiGenerationError,
  ApiDatabaseError,
  ApiValidationError400,
} from '../errors/http'
import { CurrentUser } from '../middleware/auth'
import { AiClient } from '../services/ai'

export const AiLive = HttpApiBuilder.group(TeacherExamApi, 'ai', (handlers) =>
  handlers.handle('generateExam', ({ payload }) =>
    Effect.gen(function* () {
      const { userId } = yield* CurrentUser
      const aiService = yield* AiClient
      const result = yield* Effect.tryPromise({
        try: () => generateExam(userId, payload, aiService),
        catch: () => new ApiDatabaseError({ error: 'Database error', code: 'DATABASE_ERROR' }),
      })

      switch (result._tag) {
        case 'validation_error':
          return yield* Effect.fail(
            new ApiValidationError400({
              error: 'Validation failed',
              details: result.details,
            }),
          )
        case 'ai_error':
          return yield* Effect.fail(
            new ApiAiGenerationError({
              error: 'AI generation failed',
              message: result.message,
            }),
          )
        case 'database_error':
          return yield* Effect.fail(
            new ApiDatabaseError({ error: result.message, code: 'DATABASE_ERROR' }),
          )
        case 'success':
          return result.body as never
      }
    }),
  ),
)
