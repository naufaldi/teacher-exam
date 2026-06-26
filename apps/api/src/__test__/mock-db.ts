import { Effect, Effectable } from "effect"
import { vi } from "vitest"

const CHAIN_METHODS = [
  "from",
  "where",
  "orderBy",
  "limit",
  "offset",
  "set",
  "values",
  "innerJoin",
  "returning",
  "onConflictDoNothing"
] as const

export function makeQueryEffect<T>(result: T) {
  class Query extends Effectable.Class<T, never, never> {
    commit() {
      return Effect.succeed(result)
    }
  }
  const query = new Query() as
    & Query
    & Record<(typeof CHAIN_METHODS)[number], ReturnType<typeof vi.fn>>
  for (const m of CHAIN_METHODS) {
    query[m] = vi.fn(() => makeQueryEffect(result))
  }
  const promise = Promise.resolve(result)
  return Object.assign(query, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise)
  })
}

export function createMockDbModule() {
  const db = {
    select: vi.fn(() => makeQueryEffect([])),
    insert: vi.fn(() => makeQueryEffect(undefined)),
    update: vi.fn(() => makeQueryEffect(undefined)),
    delete: vi.fn(() => makeQueryEffect(undefined)),
    transaction: vi.fn()
  }
  return {
    db,
    exams: {
      id: "exams.id",
      userId: "exams.userId",
      createdAt: "exams.createdAt",
      isPublic: "exams.isPublic",
      publicShareSlug: "exams.publicShareSlug",
      status: "exams.status",
      discussionMd: "exams.discussionMd"
    },
    questions: {
      examId: "questions.examId",
      number: "questions.number",
      id: "questions.id",
      text: "questions.text",
      status: "questions.status"
    },
    bankQuestions: {
      id: "bank_questions.id",
      userId: "bank_questions.userId",
      questionId: "bank_questions.questionId",
      subject: "bank_questions.subject",
      grade: "bank_questions.grade",
      topics: "bank_questions.topics",
      difficulty: "bank_questions.difficulty",
      type: "bank_questions.type",
      payload: "bank_questions.payload",
      isPublic: "bank_questions.isPublic",
      usageCount: "bank_questions.usageCount",
      createdAt: "bank_questions.createdAt"
    },
    user: {
      id: "user.id",
      email: "user.email",
      name: "user.name",
      username: "user.username",
      image: "user.image",
      school: "user.school",
      gradesTaught: "user.gradesTaught",
      subjectsTaught: "user.subjectsTaught",
      profileCompleted: "user.profileCompleted",
      locale: "user.locale",
      timezone: "user.timezone",
      updatedAt: "user.updatedAt"
    },
    examTemplates: {
      id: "exam_templates.id",
      userId: "exam_templates.userId",
      name: "exam_templates.name",
      description: "exam_templates.description",
      config: "exam_templates.config",
      usageCount: "exam_templates.usageCount",
      createdAt: "exam_templates.createdAt",
      updatedAt: "exam_templates.updatedAt"
    },
    classes: {
      id: "classes.id",
      userId: "classes.userId",
      name: "classes.name",
      grade: "classes.grade",
      subject: "classes.subject",
      createdAt: "classes.createdAt",
      updatedAt: "classes.updatedAt"
    },
    students: {
      id: "students.id",
      classId: "students.classId",
      name: "students.name",
      identifier: "students.identifier",
      createdAt: "students.createdAt"
    },
    examSessions: {
      id: "exam_sessions.id",
      examId: "exam_sessions.examId",
      classId: "exam_sessions.classId",
      sessionCode: "exam_sessions.sessionCode",
      opensAt: "exam_sessions.opensAt",
      closesAt: "exam_sessions.closesAt",
      durationMinutes: "exam_sessions.durationMinutes",
      status: "exam_sessions.status",
      createdAt: "exam_sessions.createdAt",
      updatedAt: "exam_sessions.updatedAt"
    },
    sessionStudents: {
      id: "session_students.id",
      sessionId: "session_students.sessionId",
      studentId: "session_students.studentId",
      studentName: "session_students.studentName",
      identifier: "session_students.identifier",
      token: "session_students.token",
      joinedAt: "session_students.joinedAt",
      submittedAt: "session_students.submittedAt",
      answers: "session_students.answers"
    },
    sessionResults: {
      id: "session_results.id",
      sessionStudentId: "session_results.sessionStudentId",
      sessionId: "session_results.sessionId",
      examId: "session_results.examId",
      studentName: "session_results.studentName",
      score: "session_results.score",
      correctCount: "session_results.correctCount",
      totalCount: "session_results.totalCount",
      gradedStatus: "session_results.gradedStatus",
      answers: "session_results.answers",
      gradedAt: "session_results.gradedAt",
      createdAt: "session_results.createdAt",
      updatedAt: "session_results.updatedAt"
    },
    session: {},
    account: {},
    verification: {}
  }
}
