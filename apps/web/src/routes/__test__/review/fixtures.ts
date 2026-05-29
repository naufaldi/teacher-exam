import { brandExamId, brandQuestionId, brandUserId, type ExamWithQuestions } from "@teacher-exam/shared"
import { makeExamWithQuestions, REVIEW_NOW } from "../../../test/fixtures/exam.js"

export { makeExamWithQuestions }

export function makeExamWithOneAccepted(examId = "exam_accepted_state") {
  const base = makeExamWithQuestions(examId)
  return {
    ...base,
    reviewMode: "slow" as const,
    questions: base.questions.map((q, i) => i === 0 ? { ...q, status: "accepted" as const } : q)
  }
}

export function makeExamWithCompleteMetadata(id = "E"): ExamWithQuestions {
  const base = makeExamWithQuestions(id)
  return {
    ...base,
    questions: base.questions.map((q) => ({ ...q, status: "accepted" as const })),
    schoolName: "SD Negeri 1",
    academicYear: "2025/2026",
    examType: "formatif",
    examDate: "2025-06-01",
    durationMinutes: 60
  }
}

type McqMultiCorrect = readonly ["a" | "b" | "c" | "d", ...Array<"a" | "b" | "c" | "d">] & {
  readonly length: 2 | 3
}
type TfStatements = readonly [
  { readonly text: string; readonly answer: boolean },
  { readonly text: string; readonly answer: boolean },
  { readonly text: string; readonly answer: boolean }
]

export function makeExamWithMixedTypes(id = "exam_mixed"): ExamWithQuestions {
  const base = {
    id: brandExamId(id),
    userId: brandUserId("user_1"),
    title: "Mixed Types Exam",
    subject: "bahasa_indonesia" as const,
    grade: 6,
    difficulty: "sedang" as const,
    topics: ["Teks"],
    reviewMode: "fast" as const,
    status: "draft" as const,
    schoolName: null,
    academicYear: null,
    examType: "formatif",
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    createdAt: REVIEW_NOW,
    updatedAt: REVIEW_NOW
  }
  return {
    ...base,
    questions: [
      {
        _tag: "mcq_multi" as const,
        id: brandQuestionId("q-multi-1"),
        examId: brandExamId(id),
        number: 1,
        text: "Multi question",
        options: { a: "Option A", b: "Option B", c: "Option C", d: "Option D" },
        correct: ["a", "c"] as unknown as McqMultiCorrect,
        topic: null,
        difficulty: null,
        status: "pending" as const,
        validationStatus: null,
        validationReason: null,
        createdAt: REVIEW_NOW
      },
      {
        _tag: "true_false" as const,
        id: brandQuestionId("q-tf-1"),
        examId: brandExamId(id),
        number: 2,
        text: "True/False question",
        statements: [
          { text: "Statement 1", answer: true },
          { text: "Statement 2", answer: false },
          { text: "Statement 3", answer: true }
        ] as unknown as TfStatements,
        topic: null,
        difficulty: null,
        status: "pending" as const,
        validationStatus: null,
        validationReason: null,
        createdAt: REVIEW_NOW
      }
    ]
  }
}

export function makeExamWithValidation(id: string) {
  const base = makeExamWithQuestions(id)
  return {
    ...base,
    questions: base.questions.map((q, i) => ({
      ...q,
      validationStatus: i === 0 ? ("needs_review" as const) : ("valid" as const),
      validationReason: i === 0 ? "Level kognitif tinggi." : "Sesuai CP."
    }))
  }
}
