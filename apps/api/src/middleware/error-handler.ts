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
    logApiError(err, c.req.method, c.req.path, 500, body.code)
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

  logApiError(err, c.req.method, c.req.path, result.status, result.body.code)
  return c.json(result.body, result.status)
}

function logApiError(
  err: unknown,
  method: string,
  path: string,
  status: number,
  code: string,
): void {
  console.error('[api:error]', {
    method,
    path,
    status,
    code,
    error: serializeErrorForLog(err),
  })
}

function serializeErrorForLog(err: unknown): Record<string, unknown> {
  if (!isRecord(err)) return { value: String(err) }

  const out: Record<string, unknown> = {}
  if (typeof err['_tag'] === 'string') out['tag'] = err['_tag']
  if (typeof err['name'] === 'string') out['name'] = err['name']
  if (typeof err['message'] === 'string') out['message'] = sanitizeMessage(err['message'])

  const cause = err['cause']
  if (cause !== undefined) out['cause'] = serializeCauseForLog(cause)

  return out
}

function serializeCauseForLog(cause: unknown): unknown {
  if (!isRecord(cause)) return String(cause)

  const out: Record<string, unknown> = {}
  if (typeof cause['name'] === 'string') out['name'] = cause['name']
  if (typeof cause['message'] === 'string') out['message'] = sanitizeMessage(cause['message'])
  if (typeof cause['code'] === 'string') out['code'] = cause['code']
  if (typeof cause['table_name'] === 'string') out['table'] = cause['table_name']
  if (typeof cause['column_name'] === 'string') out['column'] = cause['column_name']
  if (typeof cause['constraint_name'] === 'string') out['constraint'] = cause['constraint_name']

  return out
}

function sanitizeMessage(message: string): string {
  return message.split('\nparams:')[0] ?? message
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
