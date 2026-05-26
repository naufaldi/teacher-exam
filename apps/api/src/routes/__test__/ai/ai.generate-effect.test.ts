import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Effect } from 'effect'
import { db } from '@teacher-exam/db'
import { generateExam } from '../../../lib/ai-generate.js'
import { DbClient } from '../../../api/services/db.js'
import { TestSqlLayer } from '../../../api/services/test-db.js'
import { TestCurriculumLayer } from '../../../api/services/curriculum-service.js'
import { Layer } from 'effect'
import { makeChain, makeExamRow, makeQuestionRow } from '../helpers.js'
import { fakeAiService, FAKE_AI_QUESTIONS, VALID_BODY } from './ai-setup.js'

describe('generateExam Effect integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS)),
    )
  })

  it('completes with success tag using mock db', async () => {
    const examRow = makeExamRow()
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({ id: `q-${i + 1}`, examId: examRow.id, number: i + 1 }),
    )
    ;(db.insert as Mock).mockReturnValue(makeChain(undefined))
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const result = await Effect.runPromise(
      generateExam('test-user-id', VALID_BODY, fakeAiService).pipe(
        Effect.provide(Layer.mergeAll(
          Layer.succeed(DbClient, db as never),
          TestSqlLayer,
          TestCurriculumLayer(),
        )),
      ),
    )

    expect(result._tag).toBe('success')
  })
})
