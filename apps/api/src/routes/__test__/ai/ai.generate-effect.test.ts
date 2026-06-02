import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { BankServiceLive } from "../../../api/services/bank-service.js"
import { TestCurriculumLayer } from "../../../api/services/curriculum-service.js"
import { DbClient } from "../../../api/services/db.js"
import { TestSqlLayer } from "../../../api/services/test-db.js"
import { generateExam } from "../../../lib/ai-generate.js"
import { makeChain, makeExamRow, makeQuestionRow } from "../helpers.js"
import { FAKE_AI_QUESTIONS, fakeAiService, mockGenerateDbSelects, VALID_BODY } from "./ai-setup.js"

describe("generateExam Effect integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS))
    )
  })

  it("completes with success tag using mock db", async () => {
    const examRow = makeExamRow()
    const questionRows = Array.from(
      { length: 20 },
      (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: examRow.id, number: i + 1 })
    )
    ;(db.insert as Mock).mockReturnValue(makeChain(undefined))
    mockGenerateDbSelects({ examRow, questionRows, reviewMode: "slow" })

    const input = { ...VALID_BODY, reviewMode: "slow" as const }
    const bankLayer = BankServiceLive.pipe(Layer.provide(Layer.succeed(DbClient, db as never)))
    const result = await Effect.runPromise(
      generateExam("test-user-id", input, fakeAiService).pipe(
        Effect.provide(Layer.mergeAll(
          Layer.succeed(DbClient, db as never),
          TestSqlLayer,
          TestCurriculumLayer(),
          bankLayer
        ))
      )
    )

    expect(result._tag).toBe("success")
  })

  it("returns validation_error when composition override is invalid", async () => {
    const input = {
      ...VALID_BODY,
      totalSoal: 25,
      composition: { mcqSingle: 10, mcqMulti: 10, trueFalse: 10 }
    }
    const bankLayer = BankServiceLive.pipe(Layer.provide(Layer.succeed(DbClient, db as never)))
    const result = await Effect.runPromise(
      generateExam("test-user-id", input, fakeAiService).pipe(
        Effect.provide(Layer.mergeAll(
          Layer.succeed(DbClient, db as never),
          TestSqlLayer,
          TestCurriculumLayer(),
          bankLayer
        ))
      )
    )

    expect(result._tag).toBe("validation_error")
    if (result._tag === "validation_error") {
      expect(result.details.length).toBeGreaterThan(0)
    }
  })
})
