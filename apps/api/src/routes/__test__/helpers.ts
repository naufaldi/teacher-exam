import { vi } from 'vitest'

export function makeChain(result: unknown) {
  const p = Promise.resolve(result)
  const chain: Record<string, unknown> = {
    then:  (p as Promise<unknown>).then.bind(p),
    catch: (p as Promise<unknown>).catch.bind(p),
  }
  for (const m of ['from', 'where', 'orderBy', 'limit', 'set', 'values', 'innerJoin', 'returning']) {
    chain[m] = vi.fn(() => chain)
  }
  return chain
}

const NOW = '2024-01-01T00:00:00.000Z'

export function makeQuestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id:               'q-1',
    examId:           'exam-1',
    number:           1,
    text:             'Question text',
    type:             'mcq_single',
    optionA:          'A',
    optionB:          'B',
    optionC:          'C',
    optionD:          'D',
    correctAnswer:    'a',
    payload:          null,
    topic:            null,
    difficulty:       null,
    status:           'pending',
    validationStatus: null,
    validationReason: null,
    createdAt:        new Date(NOW),
    ...overrides,
  }
}
