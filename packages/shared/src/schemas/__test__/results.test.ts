import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  GradeResultInputSchema,
  QuestionResultSchema,
  ResultIdSchema,
  SessionResultSchema,
  SessionResultsResponseSchema
} from "../../schemas/results.js"

const NOW = "2024-01-01T00:00:00.000Z"
const GRADED = "2024-01-01T10:05:00.000Z"

describe("results schemas", () => {
  it("decodes ResultIdSchema as a branded string", () => {
    const decoded = Schema.decodeUnknownEither(ResultIdSchema)("res-1")
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes QuestionResultSchema with correctness flag", () => {
    const decoded = Schema.decodeUnknownEither(QuestionResultSchema)({
      questionId: "q-1",
      number: 1,
      type: "mcq_single",
      isCorrect: true
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes SessionResultSchema with score and per-question results", () => {
    const decoded = Schema.decodeUnknownEither(SessionResultSchema)({
      id: "res-1",
      sessionId: "ses-1",
      sessionStudentId: "ss-1",
      studentName: "Budi",
      examId: "exam-1",
      score: 80,
      correctCount: 8,
      totalCount: 10,
      gradedStatus: "auto",
      answers: [
        { questionId: "q-1", number: 1, type: "mcq_single", isCorrect: true },
        { questionId: "q-2", number: 2, type: "mcq_single", isCorrect: false }
      ],
      gradedAt: GRADED,
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.score).toBe(80)
      expect(decoded.right.correctCount).toBe(8)
    }
  })

  it("rejects SessionResultSchema with invalid gradedStatus", () => {
    const decoded = Schema.decodeUnknownEither(SessionResultSchema)({
      id: "res-1",
      sessionId: "ses-1",
      sessionStudentId: "ss-1",
      studentName: "Budi",
      examId: "exam-1",
      score: 80,
      correctCount: 8,
      totalCount: 10,
      gradedStatus: "magic",
      answers: [],
      gradedAt: GRADED,
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("rejects SessionResultSchema with score out of 0-100 range", () => {
    const decoded = Schema.decodeUnknownEither(SessionResultSchema)({
      id: "res-1",
      sessionId: "ses-1",
      sessionStudentId: "ss-1",
      studentName: "Budi",
      examId: "exam-1",
      score: 150,
      correctCount: 15,
      totalCount: 10,
      gradedStatus: "auto",
      answers: [],
      gradedAt: GRADED,
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes SessionResultsResponseSchema (list + stats)", () => {
    const decoded = Schema.decodeUnknownEither(SessionResultsResponseSchema)({
      sessionId: "ses-1",
      examId: "exam-1",
      examTitle: "Latihan IPAS",
      results: [
        {
          id: "res-1",
          sessionId: "ses-1",
          sessionStudentId: "ss-1",
          studentName: "Budi",
          examId: "exam-1",
          score: 80,
          correctCount: 8,
          totalCount: 10,
          gradedStatus: "auto",
          answers: [],
          gradedAt: GRADED,
          createdAt: NOW,
          updatedAt: NOW
        }
      ],
      stats: {
        participantCount: 1,
        averageScore: 80,
        highestScore: 80,
        lowestScore: 80,
        passingCount: 1,
        passingThreshold: 70
      }
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.stats.averageScore).toBe(80)
      expect(decoded.right.results.length).toBe(1)
    }
  })

  it("decodes GradeResultInputSchema for manual override", () => {
    const decoded = Schema.decodeUnknownEither(GradeResultInputSchema)({
      score: 90,
      correctCount: 9,
      answers: [
        { questionId: "q-1", number: 1, type: "mcq_single", isCorrect: true }
      ]
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects GradeResultInputSchema with score out of range", () => {
    const decoded = Schema.decodeUnknownEither(GradeResultInputSchema)({
      score: -5,
      correctCount: 0,
      answers: []
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })
})
