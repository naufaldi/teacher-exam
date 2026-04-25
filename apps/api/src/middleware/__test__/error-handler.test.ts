import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  AiGenerationError,
  PdfParseError,
  ValidationError,
} from '../../errors/index'
import { errorHandler } from '../error-handler'

function makeApp(throwFn: () => never) {
  const app = new Hono()
  app.get('/test', () => {
    throwFn()
  })
  app.onError(errorHandler)
  return app
}

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps NotFoundError to 404 with NOT_FOUND code', async () => {
    const app = makeApp(() => {
      throw new NotFoundError({ resource: 'exam', id: 'abc' })
    })
    const res = await app.request('/test')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('NOT_FOUND')
    expect(typeof body.error).toBe('string')
  })

  it('maps UnauthorizedError to 401 with UNAUTHORIZED code', async () => {
    const app = makeApp(() => {
      throw new UnauthorizedError()
    })
    const res = await app.request('/test')
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('maps ValidationError to 422 with VALIDATION_ERROR code', async () => {
    const app = makeApp(() => {
      throw new ValidationError({ message: 'bad input' })
    })
    const res = await app.request('/test')
    expect(res.status).toBe(422)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('maps AiGenerationError to 502 with AI_GENERATION_ERROR code', async () => {
    const app = makeApp(() => {
      throw new AiGenerationError({ cause: new Error('ai fail') })
    })
    const res = await app.request('/test')
    expect(res.status).toBe(502)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('AI_GENERATION_ERROR')
  })

  it('maps PdfParseError to 422 with PDF_PARSE_ERROR code', async () => {
    const app = makeApp(() => {
      throw new PdfParseError({ cause: new Error('pdf fail') })
    })
    const res = await app.request('/test')
    expect(res.status).toBe(422)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('PDF_PARSE_ERROR')
  })

  it('maps DatabaseError to 500 with DATABASE_ERROR code', async () => {
    const app = makeApp(() => {
      throw new DatabaseError({ cause: new Error('db fail') })
    })
    const res = await app.request('/test')
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('DATABASE_ERROR')
  })

  it('maps unknown errors to 500 with INTERNAL_ERROR code', async () => {
    const app = makeApp(() => {
      throw new Error('unexpected')
    })
    const res = await app.request('/test')
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string; code: string }
    expect(body.code).toBe('INTERNAL_ERROR')
  })

  it('logs structured error context with request path and response code', async () => {
    const app = makeApp(() => {
      const cause = Object.assign(new Error('null value'), {
        code: '23502',
        table_name: 'exams',
        column_name: 'topic',
      })
      throw Object.assign(new Error('Failed query: insert into "exams"\nparams: sensitive'), {
        cause,
      })
    })

    await app.request('/test')

    expect(console.error).toHaveBeenCalledWith(
      '[api:error]',
      expect.objectContaining({
        method: 'GET',
        path: '/test',
        status: 500,
        code: 'INTERNAL_ERROR',
        error: expect.objectContaining({
          name: 'Error',
          message: 'Failed query: insert into "exams"',
          cause: expect.objectContaining({
            name: 'Error',
            code: '23502',
            table: 'exams',
            column: 'topic',
          }),
        }),
      }),
    )
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls)).not.toContain('sensitive')
  })

  it('logs tagged errors with their public response code', async () => {
    const app = makeApp(() => {
      throw new AiGenerationError({ cause: 'Claude returned incomplete output (stop_reason: max_tokens)' })
    })

    await app.request('/test')

    expect(console.error).toHaveBeenCalledWith(
      '[api:error]',
      expect.objectContaining({
        status: 502,
        code: 'AI_GENERATION_ERROR',
        error: expect.objectContaining({
          tag: 'AiGenerationError',
          cause: 'Claude returned incomplete output (stop_reason: max_tokens)',
        }),
      }),
    )
  })

  it('response has error string and code string in body', async () => {
    const app = makeApp(() => {
      throw new NotFoundError({ resource: 'question', id: 'xyz' })
    })
    const res = await app.request('/test')
    const body = await res.json() as { error: string; code: string }
    expect(typeof body.error).toBe('string')
    expect(typeof body.code).toBe('string')
  })
})
