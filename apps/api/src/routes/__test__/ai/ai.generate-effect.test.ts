import { db } from "@teacher-exam/db"
import { type FunnelSink, type FunnelStage } from "@teacher-exam/shared/funnel"
import { Effect, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { BankServiceLive } from "../../../api/services/bank-service.js"
import { TestCurriculumLayer } from "../../../api/services/curriculum-service.js"
import { DbClient } from "../../../api/services/db.js"
import { TestSqlLayer } from "../../../api/services/test-db.js"
import { generateExam } from "../../../lib/ai-generate.js"
import { installFunnelSink, resetFunnelSink } from "../../../lib/sentry.js"
import { makeChain, makeExamRow, makeQuestionRow } from "../helpers.js"
import { FAKE_AI_QUESTIONS, fakeAiService, mockGenerateDbSelects, VALID_BODY } from "./ai-setup.js"

function recordingSink(): { sink: FunnelSink; stages: Array<FunnelStage> } {
  const stages: Array<FunnelStage> = []
  const sink: FunnelSink = {
    dsn: undefined,
    append(stage) {
      stages.push(stage)
    },
    network() {}
  }
  return { sink, stages }
}

describe("generateExam Effect integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS))
    )
  })

  afterEach(() => {
    resetFunnelSink()
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

  it("records generate when question generation succeeds", async () => {
    const recorded = recordingSink()
    installFunnelSink(recorded.sink)
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
    expect(recorded.stages).toEqual(["generate"])
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
