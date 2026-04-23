import type { ErrorHandler } from 'hono'
import { Match } from 'effect'
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  AiGenerationError,
  PdfParseError,
  ValidationError,
} from '../errors/index'

type ErrorBody = { error: string; code: string; details?: unknown }

export const errorHandler: ErrorHandler = (err, c) => {
  if (!('_tag' in err)) {
    const body: ErrorBody = { error: 'Internal server error', code: 'INTERNAL_ERROR' }
    return c.json(body, 500)
  }

  const result = Match.value(err).pipe(
    Match.tag('NotFoundError', (e: NotFoundError) => ({
      status: 404 as const,
      body: {
        error: `${e.resource} not found`,
        code: 'NOT_FOUND',
      } satisfies ErrorBody,
    })),
    Match.tag('UnauthorizedError', (_e: UnauthorizedError) => ({
      status: 401 as const,
      body: {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      } satisfies ErrorBody,
    })),
    Match.tag('ValidationError', (e: ValidationError) => ({
      status: 422 as const,
      body: {
        error: e.message,
        code: 'VALIDATION_ERROR',
      } satisfies ErrorBody,
    })),
    Match.tag('AiGenerationError', (_e: AiGenerationError) => ({
      status: 502 as const,
      body: {
        error: 'AI generation failed',
        code: 'AI_GENERATION_ERROR',
      } satisfies ErrorBody,
    })),
    Match.tag('PdfParseError', (_e: PdfParseError) => ({
      status: 422 as const,
      body: {
        error: 'PDF parsing failed',
        code: 'PDF_PARSE_ERROR',
      } satisfies ErrorBody,
    })),
    Match.tag('DatabaseError', (_e: DatabaseError) => ({
      status: 500 as const,
      body: {
        error: 'Database error',
        code: 'DATABASE_ERROR',
      } satisfies ErrorBody,
    })),
    Match.orElse((_e: unknown) => ({
      status: 500 as const,
      body: {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } satisfies ErrorBody,
    })),
  )

  return c.json(result.body, result.status)
}
