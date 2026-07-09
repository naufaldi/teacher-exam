import {
  brandExamId,
  brandQuestionId,
  brandUserId,
  type Exam,
  type ExamWithQuestions,
  type McqMultiQuestion,
  type McqSingleQuestion,
  type Question,
  type TrueFalseQuestion
} from "@teacher-exam/shared"

export type MakeExamOptions = Partial<Omit<Exam, "id" | "userId">> & { id?: string; userId?: string }

/** Minimal `Exam` row for tests; accepts plain string ids and brands them. */
export function makeExam(overrides: MakeExamOptions = {}): Exam {
  const { id = "exam-1", userId = "user-1", ...rest } = overrides
  return {
    id: brandExamId(id),
    userId: brandUserId(userId),
    title: "Test Exam",
    subject: "bahasa_indonesia",
    subjectLabel: null,
    grade: 5,
    difficulty: "sedang",
    topics: ["Topik A"],
    reviewMode: "fast",
    status: "draft",
    schoolName: null,
    academicYear: null,
    semester: null,
    examType: "formatif",
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    createdAt: "2026-04-24T00:00:00.000Z",
    updatedAt: "2026-04-24T00:00:00.000Z",
    ...rest
  }
}

export const REVIEW_NOW = "2024-01-01T00:00:00.000Z"
export const PREVIEW_NOW = "2026-04-23T00:00:00.000Z"

export type MakeExamWithQuestionsOptions = {
  id?: string
  topics?: Array<string>
  questionCount?: number
  reviewMode?: "fast" | "slow"
  variant?: "review" | "preview"
  overrides?: Partial<ExamWithQuestions>
}

function defaultReviewQuestions(
  examId: string,
  count: number,
  topic: string,
  now: string
): Array<Question> {
  return Array.from({ length: count }, (_, i) => ({
    _tag: "mcq_single" as const,
    id: brandQuestionId(`q-${i + 1}`),
    examId: brandExamId(examId),
    number: i + 1,
    text: `Question ${i + 1}`,
    options: { a: "A", b: "B", c: "C", d: "D" },
    correct: "a" as const,
    topic,
    difficulty: "sedang" as const,
    status: "pending" as const,
    validationStatus: null,
    validationReason: null,
    createdAt: now
  }))
}

/** Review-style exam (id + N pending MCQ) or preview-style (topics + accepted sample questions). */
export function makeExamWithQuestions(
  idOrTopics: string | Array<string> = "exam_123",
  options: MakeExamWithQuestionsOptions = {}
): ExamWithQuestions {
  if (Array.isArray(idOrTopics)) {
    const topics = idOrTopics
    const id = options.id ?? "exam-preview"
    const now = PREVIEW_NOW
    return {
      id: brandExamId(id),
      userId: brandUserId("user-1"),
      title: "Test Exam",
      subject: "bahasa_indonesia",
      subjectLabel: null,
      grade: 6,
      difficulty: "sedang",
      topics,
      reviewMode: "fast",
      status: "draft",
      schoolName: "SD Nusantara",
      academicYear: "2025/2026",
      semester: null,
      examType: "formatif",
      examDate: "23 April 2026",
      durationMinutes: 60,
      instructions: "Pilih jawaban yang benar.",
      classContext: null,
      discussionMd: null,
      createdAt: now,
      updatedAt: now,
      questions: [makeMcqSingle(1, "a", { examId: id, now }), makeMcqSingle(2, "a", { examId: id, now })],
      ...options.overrides
    }
  }

  const id = idOrTopics
  const variant = options.variant ?? "review"
  const now = variant === "preview" ? PREVIEW_NOW : REVIEW_NOW
  const topic = options.topics?.[0] ?? "Teks Narasi"
  const questionCount = options.questionCount ?? 20

  return {
    id: brandExamId(id),
    userId: brandUserId("user_1"),
    title: "Bahasa Indonesia · Kelas 6 · Teks Narasi",
    subject: "bahasa_indonesia",
    subjectLabel: null,
    grade: 6,
    difficulty: "sedang",
    topics: options.topics ?? [topic],
    reviewMode: options.reviewMode ?? "fast",
    status: "draft",
    schoolName: null,
    academicYear: null,
    semester: null,
    examType: "formatif",
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    createdAt: now,
    updatedAt: now,
    questions: defaultReviewQuestions(id, questionCount, topic, now),
    ...options.overrides
  }
}

type McqSingleOpts = { examId?: string; now?: string; status?: McqSingleQuestion["status"] }

export function makeMcqSingle(
  number: number,
  correct: "a" | "b" | "c" | "d" = "a",
  opts: McqSingleOpts = {}
): McqSingleQuestion {
  const examId = opts.examId ?? "exam-preview"
  const now = opts.now ?? PREVIEW_NOW
  return {
    _tag: "mcq_single",
    id: brandQuestionId(`q-${number}`),
    examId: brandExamId(examId),
    number,
    text: `Soal nomor ${number}`,
    options: {
      a: "Pilihan A",
      b: "Pilihan B",
      c: "Pilihan C",
      d: "Pilihan D"
    },
    correct,
    topic: "Teks Narasi",
    difficulty: "sedang",
    status: opts.status ?? "accepted",
    validationStatus: null,
    validationReason: null,
    createdAt: now
  }
}

export function makeMcqMulti(
  number: number,
  correct: Array<"a" | "b" | "c" | "d"> = ["a", "c"],
  opts: McqSingleOpts = {}
): McqMultiQuestion {
  const examId = opts.examId ?? "exam-preview"
  const now = opts.now ?? PREVIEW_NOW
  return {
    _tag: "mcq_multi",
    id: brandQuestionId(`q-${number}`),
    examId: brandExamId(examId),
    number,
    text: `Soal nomor ${number} — Pilih dua/tiga jawaban yang benar`,
    options: {
      a: "Pilihan A",
      b: "Pilihan B",
      c: "Pilihan C",
      d: "Pilihan D"
    },
    correct,
    topic: "Teks Narasi",
    difficulty: "sedang",
    status: opts.status ?? "accepted",
    validationStatus: null,
    validationReason: null,
    createdAt: now
  }
}

export function makeTrueFalse(
  number: number,
  answers: Array<boolean> = [true, false, true],
  opts: McqSingleOpts = {}
): TrueFalseQuestion {
  const examId = opts.examId ?? "exam-preview"
  const now = opts.now ?? PREVIEW_NOW
  return {
    _tag: "true_false",
    id: brandQuestionId(`q-${number}`),
    examId: brandExamId(examId),
    number,
    text: `Soal nomor ${number}`,
    statements: answers.map((answer, i) => ({
      text: `Pernyataan ${i + 1}`,
      answer
    })),
    topic: "Teks Narasi",
    difficulty: "sedang",
    status: opts.status ?? "accepted",
    validationStatus: null,
    validationReason: null,
    createdAt: now
  }
}
