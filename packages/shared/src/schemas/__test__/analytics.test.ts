import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  ClassAnalyticsResponseSchema,
  ExamAnalyticsResponseSchema,
  QuestionAnalyticsSchema,
  ScoreBandSchema
} from "../../schemas/analytics.js"

describe("analytics schemas", () => {
  it("decodes ScoreBandSchema", () => {
    const decoded = Schema.decodeUnknownEither(ScoreBandSchema)({
      range: "80-100",
      count: 5
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes QuestionAnalyticsSchema with correctness rate", () => {
    const decoded = Schema.decodeUnknownEither(QuestionAnalyticsSchema)({
      questionId: "q-1",
      number: 1,
      type: "mcq_single",
      correctRate: 75,
      answeredCount: 10
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.correctRate).toBe(75)
    }
  })

  it("rejects QuestionAnalyticsSchema with correctRate out of 0-100", () => {
    const decoded = Schema.decodeUnknownEither(QuestionAnalyticsSchema)({
      questionId: "q-1",
      number: 1,
      type: "mcq_single",
      correctRate: 150,
      answeredCount: 10
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes ExamAnalyticsResponseSchema with distribution + per-question", () => {
    const decoded = Schema.decodeUnknownEither(ExamAnalyticsResponseSchema)({
      examId: "exam-1",
      examTitle: "Latihan IPAS",
      sessionCount: 2,
      participantCount: 10,
      averageScore: 78,
      completionRate: 90,
      scoreDistribution: [
        { range: "0-59", count: 1 },
        { range: "60-69", count: 2 },
        { range: "70-79", count: 3 },
        { range: "80-100", count: 4 }
      ],
      perQuestion: [
        { questionId: "q-1", number: 1, type: "mcq_single", correctRate: 80, answeredCount: 10 }
      ]
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.participantCount).toBe(10)
      expect(decoded.right.scoreDistribution.length).toBe(4)
    }
  })

  it("rejects ExamAnalyticsResponseSchema with completionRate out of range", () => {
    const decoded = Schema.decodeUnknownEither(ExamAnalyticsResponseSchema)({
      examId: "exam-1",
      examTitle: "Latihan IPAS",
      sessionCount: 2,
      participantCount: 10,
      averageScore: 78,
      completionRate: 150,
      scoreDistribution: [],
      perQuestion: []
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes ClassAnalyticsResponseSchema", () => {
    const decoded = Schema.decodeUnknownEither(ClassAnalyticsResponseSchema)({
      classId: "cls-1",
      className: "Kelas 5A",
      examCount: 3,
      participantCount: 25,
      averageScore: 72
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.className).toBe("Kelas 5A")
    }
  })
})
