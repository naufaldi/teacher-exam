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
  "leftJoin",
  "groupBy",
  "returning",
  "onConflictDoNothing",
  "onConflictDoUpdate"
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
      bankedAt: "exams.bankedAt",
      discussionMd: "exams.discussionMd"
    },
    questions: {
      examId: "questions.examId",
      number: "questions.number",
      id: "questions.id",
      text: "questions.text",
      status: "questions.status"
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
    verification: {},
    pdfUploads: {
      id: "pdf_uploads.id",
      userId: "pdf_uploads.userId",
      fileName: "pdf_uploads.fileName",
      fileSize: "pdf_uploads.fileSize",
      storageKey: "pdf_uploads.storageKey",
      status: "pdf_uploads.status",
      uploadedAt: "pdf_uploads.uploadedAt",
      readyAt: "pdf_uploads.readyAt",
      deletedAt: "pdf_uploads.deletedAt",
      pageCount: "pdf_uploads.pageCount",
      errorMessage: "pdf_uploads.errorMessage",
      extractedText: "pdf_uploads.extracted_text"
    },
    examPilotOutcomes: {
      id: "exam_pilot_outcomes.id",
      userId: "exam_pilot_outcomes.userId",
      examId: "exam_pilot_outcomes.examId",
      trigger: "exam_pilot_outcomes.trigger",
      readiness: "exam_pilot_outcomes.readiness",
      firstExportAt: "exam_pilot_outcomes.firstExportAt",
      answeredAt: "exam_pilot_outcomes.answeredAt",
      createdAt: "exam_pilot_outcomes.createdAt",
      updatedAt: "exam_pilot_outcomes.updatedAt"
    },
    ingestJobs: {
      id: "ingest_jobs.id",
      pdfUploadId: "ingest_jobs.pdf_upload_id",
      status: "ingest_jobs.status",
      createdAt: "ingest_jobs.created_at",
      startedAt: "ingest_jobs.started_at",
      finishedAt: "ingest_jobs.finished_at",
      error: "ingest_jobs.error"
    },
    documentChunks: {
      id: "document_chunks.id",
      docId: "document_chunks.doc_id",
      source: "document_chunks.source",
      content: "document_chunks.content",
      metadata: "document_chunks.metadata",
      embedding: "document_chunks.embedding",
      createdAt: "document_chunks.created_at"
    },
    generationJobs: {
      id: "generation_jobs.id",
      examId: "generation_jobs.exam_id",
      status: "generation_jobs.status",
      questionsTarget: "generation_jobs.questions_target",
      questionsDone: "generation_jobs.questions_done",
      inputJson: "generation_jobs.input_json",
      error: "generation_jobs.error",
      startedAt: "generation_jobs.started_at",
      finishedAt: "generation_jobs.finished_at",
      createdAt: "generation_jobs.created_at"
    }
  }
}
