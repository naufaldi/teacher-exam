import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  CreateSessionInputSchema,
  ExamSessionSchema,
  SessionDetailResponseSchema,
  SessionSchema,
  SessionStudentSchema,
  StartSessionInputSchema,
  SubmitSessionInputSchema
} from "../../schemas/sessions.js"

const NOW = "2024-01-01T00:00:00.000Z"
const OPEN = "2024-01-01T08:00:00.000Z"
const CLOSE = "2024-01-01T10:00:00.000Z"

describe("sessions schemas", () => {
  it("decodes ExamSessionSchema with status and window", () => {
    const decoded = Schema.decodeUnknownEither(ExamSessionSchema)({
      id: "ses-1",
      examId: "exam-1",
      classId: "cls-1",
      sessionCode: "ABC123",
      opensAt: OPEN,
      closesAt: CLOSE,
      durationMinutes: 90,
      status: "scheduled",
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects ExamSessionSchema with invalid status", () => {
    const decoded = Schema.decodeUnknownEither(ExamSessionSchema)({
      id: "ses-1",
      examId: "exam-1",
      classId: "cls-1",
      sessionCode: "ABC123",
      opensAt: OPEN,
      closesAt: CLOSE,
      durationMinutes: 90,
      status: "paused",
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes SessionSchema (alias of ExamSession)", () => {
    const decoded = Schema.decodeUnknownEither(SessionSchema)({
      id: "ses-1",
      examId: "exam-1",
      classId: "cls-1",
      sessionCode: "ABC123",
      opensAt: OPEN,
      closesAt: CLOSE,
      durationMinutes: 90,
      status: "open",
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes SessionStudentSchema with token and joinedAt", () => {
    const decoded = Schema.decodeUnknownEither(SessionStudentSchema)({
      id: "ss-1",
      sessionId: "ses-1",
      studentId: "std-1",
      studentName: "Budi",
      identifier: null,
      token: "tok-abc",
      joinedAt: NOW,
      submittedAt: null
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes CreateSessionInputSchema with classId and window", () => {
    const decoded = Schema.decodeUnknownEither(CreateSessionInputSchema)({
      classId: "cls-1",
      opensAt: OPEN,
      closesAt: CLOSE,
      durationMinutes: 60
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects CreateSessionInputSchema with negative duration", () => {
    const decoded = Schema.decodeUnknownEither(CreateSessionInputSchema)({
      classId: "cls-1",
      opensAt: OPEN,
      closesAt: CLOSE,
      durationMinutes: -5
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes StartSessionInputSchema with name and optional identifier", () => {
    const decoded = Schema.decodeUnknownEither(StartSessionInputSchema)({
      studentName: "Budi",
      identifier: "NIS-001"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes StartSessionInputSchema with token-only (existing student)", () => {
    const decoded = Schema.decodeUnknownEither(StartSessionInputSchema)({
      token: "tok-existing"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes SubmitSessionInputSchema with answers keyed by questionId", () => {
    const decoded = Schema.decodeUnknownEither(SubmitSessionInputSchema)({
      token: "tok-abc",
      answers: {
        "q-1": { _tag: "mcq_single", answer: "a" },
        "q-2": { _tag: "true_false", answers: [true, false, true] }
      }
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes SessionDetailResponseSchema without leaking correct answers", () => {
    const decoded = Schema.decodeUnknownEither(SessionDetailResponseSchema)({
      sessionCode: "ABC123",
      title: "Latihan IPAS",
      subject: "ipas",
      grade: 5,
      durationMinutes: 60,
      opensAt: OPEN,
      closesAt: CLOSE,
      status: "open",
      questions: [
        {
          id: "q-1",
          number: 1,
          _tag: "mcq_single",
          text: "Berapa 2 + 2?",
          options: { a: "3", b: "4", c: "5", d: "6" }
        },
        {
          id: "q-2",
          number: 2,
          _tag: "true_false",
          text: "Pernyataan berikut benar?",
          statements: [
            { text: "Air membeku di 0C", answer: true },
            { text: "Air mendidih di 50C", answer: false }
          ]
        }
      ]
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      const json = JSON.stringify(decoded.right)
      expect(json).not.toContain("\"correct\"")
    }
  })

  it("strips any correct field from decoded session questions", () => {
    const decoded = Schema.decodeUnknownEither(SessionDetailResponseSchema)({
      sessionCode: "ABC123",
      title: "Latihan",
      subject: "ipas",
      grade: 5,
      durationMinutes: 60,
      opensAt: OPEN,
      closesAt: CLOSE,
      status: "open",
      questions: [
        {
          id: "q-1",
          number: 1,
          _tag: "mcq_single",
          text: "?",
          options: { a: "1", b: "2", c: "3", d: "4" },
          correct: "b"
        }
      ]
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      const json = JSON.stringify(decoded.right)
      expect(json).not.toContain("\"correct\"")
    }
  })
})
