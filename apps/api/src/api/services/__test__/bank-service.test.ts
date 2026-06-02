import { assert, describe, it } from "@effect/vitest"
import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { type Mock } from "vitest"
import { makeChain } from "../../../routes/__test__/helpers"
import { BankService, BankServiceLive } from "../bank-service"
import { DbClient } from "../db"

const NOW = new Date("2024-01-01T00:00:00.000Z")

function makeQuestionRow() {
  return {
    id: "q-1",
    examId: "exam-1",
    text: "soal",
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer: "A",
    type: "mcq_single",
    payload: null,
    topic: "aljabar",
    difficulty: "mudah"
  }
}

function makeExamRow() {
  return {
    id: "exam-1",
    userId: "test-user-id",
    subject: "matematika",
    grade: 10,
    difficulty: "mudah"
  }
}

function makeBankQuestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "bank-existing",
    userId: "test-user-id",
    questionId: "q-1",
    subject: "matematika",
    grade: 10,
    topics: [],
    difficulty: "mudah",
    type: "mcq_single",
    payload: {},
    isPublic: false,
    usageCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  }
}

describe("BankServiceLive", () => {
  it.effect("browseOwn does not require DbClient from the caller", () =>
    Effect.gen(function*() {
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) {
          return makeChain([{ count: 0 }])
        }
        return makeChain([])
      })

      const bankService = yield* BankService
      const result = yield* bankService.browseOwn("test-user-id", {})
      assert.strictEqual(result.total, 0)
      assert.strictEqual(result.data.length, 0)
    }).pipe(Effect.provide(Layer.provide(BankServiceLive, Layer.succeed(DbClient, db as never)))))

  it.effect(
    "saveQuestion returns the existing row when onConflictDoNothing hits, instead of masking DB errors as a stale success",
    () =>
      Effect.gen(function*() {
        const questionRow = makeQuestionRow()
        const examRow = makeExamRow()
        const existingBankRow = makeBankQuestionRow()

        // saveQuestion calls select(question) → select(exam) → insert(...) → select(existing).
        let selectCount = 0
        ;(db.select as Mock).mockImplementation(() => {
          selectCount++
          if (selectCount === 1) return makeChain([questionRow])
          if (selectCount === 2) return makeChain([examRow])
          return makeChain([existingBankRow])
        }) // Insert returns an empty array — onConflictDoNothing hit the
         // existing (userId, questionId) row, so the re-SELECT must take over.
        ;(db.insert as Mock).mockImplementation(() => makeChain([]))

        const bankService = yield* BankService
        const result = yield* bankService.saveQuestion("test-user-id", {
          questionId: "q-1"
        } as never)

        assert.strictEqual(result.id, "bank-existing")
        assert.strictEqual(selectCount, 3, "re-SELECT must run exactly once on conflict")
      }).pipe(Effect.provide(Layer.provide(BankServiceLive, Layer.succeed(DbClient, db as never))))
  )
})
