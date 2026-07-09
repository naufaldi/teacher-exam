import { assert, describe, it } from "@effect/vitest"
import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { type Mock } from "vitest"
import { makeChain } from "../../../routes/__test__/helpers"
import { BankService, BankServiceLive } from "../bank-service"
import { DbClient } from "../db"

const NOW = new Date("2024-01-01T00:00:00.000Z")

function makeBankedExamRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam-1",
    userId: "test-user-id",
    title: "Matematika / Kelas 5",
    subject: "matematika",
    grade: 5,
    difficulty: "mudah",
    topics: ["Pecahan"],
    reviewMode: "fast",
    status: "final",
    isPublic: true,
    bankedAt: NOW,
    examType: "formatif",
    schoolName: null,
    academicYear: null,
  semester: null,
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    publicShareSlug: null,
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  }
}

describe("BankServiceLive", () => {
  it.effect("browseSheets does not require DbClient from the caller", () =>
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
      const result = yield* bankService.browseSheets("test-user-id", {})
      assert.strictEqual(result.total, 0)
      assert.strictEqual(result.data.length, 0)
    }).pipe(Effect.provide(Layer.provide(BankServiceLive, Layer.succeed(DbClient, db as never)))))

  it.effect("browseSheets returns question counts from accepted questions", () =>
    Effect.gen(function*() {
      const examRow = makeBankedExamRow()
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) return makeChain([{ count: 1 }])
        if (selectCount === 2) return makeChain([{ exam: examRow }])
        return makeChain([{ examId: examRow.id, questionCount: 12 }])
      })

      const bankService = yield* BankService
      const result = yield* bankService.browseSheets("test-user-id", {})
      assert.strictEqual(result.total, 1)
      assert.strictEqual(result.data[0]?.questionCount, 12)
    }).pipe(Effect.provide(Layer.provide(BankServiceLive, Layer.succeed(DbClient, db as never)))))
})
