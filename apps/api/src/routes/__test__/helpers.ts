import { vi } from "vitest"
import { makeQueryEffect } from "../../__test__/mock-db.js"

export function makeChain(result: unknown) {
  return makeQueryEffect(result)
}

const NOW = "2024-01-01T00:00:00.000Z"

export function makeExamRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam-1",
    userId: "test-user-id",
    title: "Bahasa Indonesia · Kelas 6",
    subject: "bahasa_indonesia",
    grade: 6,
    difficulty: "sedang",
    topics: ["Teks Narasi"],
    reviewMode: "slow",
    status: "draft",
    schoolName: null,
    academicYear: null,
    examType: "formatif",
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    isPublic: false,
    publicShareSlug: null,
    publishedAt: null,
    bankedAt: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

export function makeQuestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "q-1",
    examId: "exam-1",
    number: 1,
    text: "Question text",
    type: "mcq_single",
    optionA: "A",
    optionB: "B",
    optionC: "C",
    optionD: "D",
    correctAnswer: "a",
    payload: null,
    topic: null,
    difficulty: null,
    status: "pending",
    validationStatus: null,
    validationReason: null,
    createdAt: new Date(NOW),
    ...overrides
  }
}

export { vi }
