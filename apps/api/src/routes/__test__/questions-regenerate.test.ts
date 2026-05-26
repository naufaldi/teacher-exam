import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Effect, Stream } from 'effect'
import type { GeneratedQuestion } from '@teacher-exam/shared'
import type { AiService } from '../../services/AiService'
import { createAiService } from '../../services/AiService'
import { createFakeModelLayersFromText } from '../../lib/effect-ai/test-utils'
import { AiGenerationError } from '../../errors'

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((col, val) => ({ op: 'eq', col, val })),
  ne:  vi.fn((col, val) => ({ op: 'ne', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))


import { db } from '@teacher-exam/db'
import { makeChain, makeQuestionRow, makeExamRow } from './helpers.js'
import { buildHttpApiTestApp } from './http-api-setup'

function buildTestApp(aiService?: AiService) {
  return buildHttpApiTestApp({
    userId: 'test-user-id',
    ...(aiService !== undefined ? { aiService } : {}),
  })
}

function makeGeneratedQuestion(overrides: Partial<Extract<GeneratedQuestion, { _tag: 'mcq_single' }>> = {}): Extract<GeneratedQuestion, { _tag: 'mcq_single' }> {
  return {
    _tag:           'mcq_single',
    number:         1,
    text:           'New question text',
    option_a:       'Option A',
    option_b:       'Option B',
    option_c:       'Option C',
    option_d:       'Option D',
    correct_answer: 'b',
    topic:          'Teks Narasi',
    difficulty:     'sedang',
    ...overrides,
  }
}

function makeFakeAiService(overrides: Partial<AiService> = {}): AiService {
  return {
    generate: vi.fn(),
    validateCurriculum: vi.fn(({ expectedCount }: { expectedCount: number }) =>
      Effect.succeed(
        Array.from({ length: expectedCount }, () => ({
          number: 1,
          status: 'valid' as const,
          reason: 'Sesuai CP.',
        })),
      ),
    ),
    generateDiscussion: vi.fn(),
    streamDiscussion: vi.fn(() => Stream.succeed('')),
    ...overrides,
  }
}

function mockRegenerateUpdates(
  contentRow: ReturnType<typeof makeQuestionRow>,
  validatedRow?: ReturnType<typeof makeQuestionRow>,
) {
  let updateCount = 0
  ;(db.update as Mock).mockImplementation(() => {
    updateCount++
    const row = updateCount === 1
      ? contentRow
      : (validatedRow ?? { ...contentRow, validationStatus: 'valid', validationReason: 'Sesuai CP.' })
    return makeChain([row])
  })
}

describe('PATCH /api/questions/:id accepts status: pending', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 when status is pending', async () => {
    const questionRow = makeQuestionRow({ status: 'pending' })
    ;(db.select as Mock)
      .mockReturnValueOnce(makeChain([{ questionId: 'q-1', examUserId: 'test-user-id' }]))
      .mockReturnValueOnce(makeChain([questionRow]))
    ;(db.update as Mock).mockReturnValue(makeChain([questionRow]))

    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'pending' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['status']).toBe('pending')
  })
})

describe('POST /api/questions/:id/regenerate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 404 when question belongs to another user', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))  // ownership check returns nothing
    const fakeAi = makeFakeAiService()
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })

  it('replaces the question row content and leaves validationStatus null', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({
      text: 'New question text',
      optionB: 'Option B',
      status: 'pending',
      validationStatus: null,
      validationReason: null,
    })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])  // ownership + question
      return makeChain([])  // sibling questions (no others)
    })
    ;(db.update as Mock).mockReturnValue(makeChain([updatedRow]))

    const generated = makeGeneratedQuestion()
    const fakeAi = makeFakeAiService({
      generate: vi.fn(() => Effect.succeed([generated])),
    })
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['id']).toBe('q-1')
    expect(body['status']).toBe('pending')
    expect(body['validationStatus']).toBeNull()
    expect(fakeAi.validateCurriculum).not.toHaveBeenCalled()
    expect((db.update as Mock).mock.calls).toHaveLength(1)
  })

  it('includes Matematika LaTeX rules in regenerate prompt for matematika exams', async () => {
    const examRow = makeExamRow({ subject: 'matematika' })
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({ status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })
    ;(db.update as Mock).mockReturnValue(makeChain([updatedRow]))

    const generated = makeGeneratedQuestion({ text: 'Hasil dari 5.678 + 3.421 adalah ....' })
    const fakeAi = makeFakeAiService({
      generate: vi.fn(() => Effect.succeed([generated])),
    })
    const app = buildTestApp(fakeAi)

    await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })

    expect(fakeAi.generate).toHaveBeenCalledWith(
      expect.objectContaining({ system: expect.stringContaining('pemisah ribuan') }),
    )
  })

  it('marks needs_review when regenerated Matematika LaTeX is invalid', async () => {
    const examRow = makeExamRow({ subject: 'matematika' })
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({
      status: 'pending',
      validationStatus: 'needs_review',
      validationReason: 'LaTeX validation failed: LaTeX command outside delimiters: \\div',
    })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })
    ;(db.update as Mock).mockReturnValue(makeChain([updatedRow]))

    const generated = makeGeneratedQuestion({ text: 'Hasil dari 1.824 \\div 12 adalah ....' })
    const fakeAi = makeFakeAiService({
      generate: vi.fn(() => Effect.succeed([generated])),
    })
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['validationStatus']).toBe('needs_review')
    expect(String(body['validationReason'])).toContain('LaTeX')
  })

  it('forwards the hint to the AI service', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({ status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })
    mockRegenerateUpdates(updatedRow)

    const generated = makeGeneratedQuestion()
    const fakeAi = makeFakeAiService({
      generate: vi.fn(() => Effect.succeed([generated])),
    })
    const app = buildTestApp(fakeAi)

    await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ hint: 'fokus ke sila ke-3' }),
    })

    expect(fakeAi.generate).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.stringContaining('fokus ke sila ke-3') }),
    )
  })

  // Regression for the "Regenerate gagal" bug: the regenerate route's inline
  // system prompt must instruct Claude to include `_tag` and `number` —
  // both are required by `GeneratedQuestionSchema` (tagged Schema.Union in
  // packages/shared). Without them, parseAndValidate rejects the response
  // and the route returns 502.
  it('system prompt instructs Claude to include `_tag` and `number` fields', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({ status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })
    mockRegenerateUpdates(updatedRow)

    const generated = makeGeneratedQuestion()
    const fakeAi = makeFakeAiService({
      generate: vi.fn(() => Effect.succeed([generated])),
    })
    const app = buildTestApp(fakeAi)

    await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })

    expect(fakeAi.generate).toHaveBeenCalledOnce()
    const call = (fakeAi.generate as Mock).mock.calls[0]?.[0] as { system: string }
    expect(call.system).toContain('_tag')
    expect(call.system).toContain('mcq_single')
    expect(call.system).toContain('number')
  })

  // Regression: prompt at routes/questions.ts must instruct Claude to emit
  // `_tag` + `number` so `parseAndValidate` against `GeneratedQuestionSchema`
  // (a tagged Schema.Union) succeeds. Earlier tests injected a fake `AiService`
  // and bypassed the schema check entirely — this one wires the real
  // `createAiService` so the contract is exercised end-to-end.
  it('decodes a schema-shaped Anthropic response (real parseAndValidate path)', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({ text: 'New question text', status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })
    mockRegenerateUpdates(updatedRow)

    const aiPayload = [{
      _tag:           'mcq_single',
      number:         1,
      text:           'New question text',
      option_a:       'A',
      option_b:       'B',
      option_c:       'C',
      option_d:       'D',
      correct_answer: 'b',
      topic:          'Teks Narasi',
      difficulty:     'sedang',
    }]
    const { layers } = createFakeModelLayersFromText(JSON.stringify(aiPayload))
    const aiService = createAiService({ layers })
    const app = buildTestApp(aiService)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ hint: 'fokus dongeng nusantara' }),
    })

    expect(res.status).toBe(200)
  })

  it('returns 502 when Anthropic returns a payload missing `_tag`', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })

    // Pre-fix shape: looks plausible but has no `_tag` discriminator → schema rejects.
    const malformedPayload = [{
      number:         1,
      text:           'Anything',
      option_a:       'A',
      option_b:       'B',
      option_c:       'C',
      option_d:       'D',
      correct_answer: 'a',
      topic:          'X',
      difficulty:     'sedang',
    }]
    const { layers } = createFakeModelLayersFromText(JSON.stringify(malformedPayload))
    const aiService = createAiService({ layers })
    const app = buildTestApp(aiService)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(502)
  })

  it('returns 502 when AI service throws', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })

    const fakeAi = makeFakeAiService({
      generate: vi.fn(() =>
        Effect.fail(new AiGenerationError({ cause: 'Claude quota exceeded' })),
      ),
    })
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(502)
  })
})
