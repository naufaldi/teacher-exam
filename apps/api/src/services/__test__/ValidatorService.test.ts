import { assert, describe, it } from "@effect/vitest"
import type { Question } from "@teacher-exam/shared"
import { Effect, Stream } from "effect"
import { vi } from "vitest"
import { AiGenerationError } from "../../errors"
import type { AiService } from "../AiService"
import { validateQuestionBatch } from "../ValidatorService"

function makeQuestion(n: number, overrides: Partial<Question> = {}): Question {
  return {
    id: `q-${n}`,
    examId: "exam-1",
    number: n,
    text: `Soal ${n}`,
    topic: "Topik",
    difficulty: "sedang",
    status: "pending",
    validationStatus: null,
    validationReason: null,
    figure: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    _tag: "mcq_single",
    options: { a: "A", b: "B", c: "C", d: "D" },
    correct: "a",
    ...overrides
  } as Question
}

describe("validateQuestionBatch", () => {
  it.effect("merges curriculum validation with existing structural flags", () =>
    Effect.gen(function*() {
      const aiService: AiService = {
        generate: vi.fn(),
        generateRaw: vi.fn(),
        validateCurriculum: vi.fn(() =>
          Effect.succeed([
            { number: 1, status: "valid", reason: "Sesuai CP." },
            { number: 2, status: "valid", reason: "Sesuai CP." }
          ])
        ),
        generateDiscussion: vi.fn(),
        streamDiscussion: vi.fn(() => Stream.succeed(""))
      }

      const updates = yield* validateQuestionBatch({
        aiService,
        exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
        curriculumText: "corpus",
        questions: [
          makeQuestion(1, { validationStatus: "needs_review", validationReason: "LaTeX invalid" }),
          makeQuestion(2)
        ]
      })

      assert.deepStrictEqual(updates, [
        {
          id: "q-1",
          validationStatus: "needs_review",
          validationReason: "LaTeX invalid\nSesuai CP."
        },
        {
          id: "q-2",
          validationStatus: "valid",
          validationReason: "Sesuai CP."
        }
      ])
    }))

  it.effect("chunks large batches and respects concurrency limit", () =>
    Effect.gen(function*() {
      const questions = Array.from({ length: 12 }, (_, i) => makeQuestion(i + 1))
      let inFlight = 0
      let maxInFlight = 0

      const aiService: AiService = {
        generate: vi.fn(),
        generateRaw: vi.fn(),
        validateCurriculum: vi.fn(({ expectedCount }) => {
          inFlight++
          maxInFlight = Math.max(maxInFlight, inFlight)
          return Effect.gen(function*() {
            yield* Effect.promise(() => new Promise((r) => setTimeout(r, 10)))
            inFlight--
            return Array.from({ length: expectedCount }, (_, i) => ({
              number: i + 1,
              status: "valid" as const,
              reason: "ok"
            }))
          })
        }),
        generateDiscussion: vi.fn(),
        streamDiscussion: vi.fn(() => Stream.succeed(""))
      }

      const updates = yield* validateQuestionBatch({
        aiService,
        exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
        curriculumText: "corpus",
        questions
      })

      assert.strictEqual(updates.length, 12)
      assert.isTrue(maxInFlight <= 3)
      assert.strictEqual(
        (aiService.validateCurriculum as ReturnType<typeof vi.fn>).mock.calls.length,
        3
      )
    }))

  it.effect("falls back to needs_review when a chunk fails", () =>
    Effect.gen(function*() {
      let call = 0
      const aiService: AiService = {
        generate: vi.fn(),
        generateRaw: vi.fn(),
        validateCurriculum: vi.fn(({ expectedCount }) => {
          call++
          if (call === 2) {
            return Effect.fail(new AiGenerationError({ cause: "timeout" }))
          }
          return Effect.succeed(
            Array.from({ length: expectedCount }, (_, i) => ({
              number: i + 1,
              status: "valid" as const,
              reason: "ok"
            }))
          )
        }),
        generateDiscussion: vi.fn(),
        streamDiscussion: vi.fn(() => Stream.succeed(""))
      }

      const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1))
      const updates = yield* validateQuestionBatch({
        aiService,
        exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
        curriculumText: "corpus",
        questions
      })

      assert.strictEqual(updates.length, 10)
      const failedChunk = updates.slice(5, 10)
      assert.isTrue(failedChunk.every((u) => u.validationStatus === "needs_review"))
      assert.include(failedChunk[0]?.validationReason ?? "", "Validasi kurikulum gagal")
    }))
})
