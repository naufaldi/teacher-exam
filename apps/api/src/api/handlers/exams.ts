import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { SqlClient } from "@effect/sql/SqlClient"
import { exams, questions } from "@teacher-exam/db"
import { formatExamTitle, resolveExamSubjectLabel, UpdateExamInputSchema } from "@teacher-exam/shared"
import type { ExamShareResponse, ExamWithQuestions } from "@teacher-exam/shared"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { fetchExamWithQuestions, toExam } from "../../lib/exams-query"
import { getGenerateStreamResponse } from "../../lib/generation-job-service"
import { buildPembahasanPrompt } from "../../lib/pembahasan-prompt"
import { rowToQuestion } from "../../lib/question-mapper"
import { validateExamCurriculum } from "../../lib/validate-exam-curriculum"
import { TeacherExamApi } from "../definition"
import {
  ApiDatabaseError,
  ApiDiscussionExists,
  ApiExamNotFinal,
  ApiFinalizeNotAllowed,
  ApiNotFound,
  ApiValidationError422
} from "../errors/http"
import { runDb } from "../lib/db-effect"
import { runDiscussionSse } from "../lib/sse-discussion"
import { CurrentUser } from "../middleware/auth"
import { AiClient } from "../services/ai"
import { DbClient } from "../services/db"

export const ExamsLive = HttpApiBuilder.group(TeacherExamApi, "exams", (handlers) =>
  handlers
    .handle("listExams", () =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const db = yield* DbClient
        const rows = yield* runDb(
          db.select().from(exams).where(eq(exams.userId, userId)).orderBy(desc(exams.createdAt))
        )
        const examIds = rows.map((row) => row.id)
        const countRows = examIds.length === 0
          ? []
          : yield* runDb(
            db
              .select({
                examId: questions.examId,
                questionCount: sql<number>`count(*)::int`
              })
              .from(questions)
              .where(and(inArray(questions.examId, examIds), eq(questions.status, "accepted")))
              .groupBy(questions.examId)
          )
        const counts = new Map(countRows.map((row) => [row.examId, row.questionCount]))
        return rows.map((r) => ({
          ...toExam(r),
          questionCount: counts.get(r.id) ?? 0
        }))
      }))
    .handle("getExam", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(eq(exams.id, id))
            .limit(1)
        )

        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const isOwner = examRow.userId === userId
        const isPublicBankSheet = examRow.isPublic &&
          examRow.status === "final" &&
          examRow.bankedAt !== null

        if (!isOwner && !isPublicBankSheet) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const questionRows = yield* runDb(
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number)
        )

        const result: ExamWithQuestions = {
          ...toExam(examRow),
          questions: questionRows.map((q) => rowToQuestion(q))
        }
        return result
      }))
    .handle("patchExam", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient

        const decode = Schema.decodeUnknownEither(UpdateExamInputSchema)
        const parsed = decode(payload)
        if (parsed._tag === "Left") {
          return yield* Effect.fail(
            new ApiValidationError422({
              error: "Validation failed",
              code: "VALIDATION_ERROR",
              details: String(parsed.left)
            })
          )
        }
        const input = parsed.right

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1)
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() }
        if (input.title !== undefined) updateData["title"] = input.title
        if (input.schoolName !== undefined) updateData["schoolName"] = input.schoolName
        if (input.academicYear !== undefined) updateData["academicYear"] = input.academicYear
        if (input.examType !== undefined) updateData["examType"] = input.examType
        if (input.examDate !== undefined) updateData["examDate"] = input.examDate
        if (input.durationMinutes !== undefined) updateData["durationMinutes"] = input.durationMinutes
        if (input.instructions !== undefined) updateData["instructions"] = input.instructions
        if (input.classContext !== undefined) updateData["classContext"] = input.classContext
        if (input.status !== undefined) updateData["status"] = input.status
        if (input.reviewMode !== undefined) updateData["reviewMode"] = input.reviewMode

        yield* runDb(
          db.update(exams).set(updateData).where(and(eq(exams.id, id), eq(exams.userId, userId)))
        )

        const updatedRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1)
        )

        const updatedRow = updatedRows[0]
        if (!updatedRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const questionRows = yield* runDb(
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number)
        )

        return {
          ...toExam(updatedRow),
          questions: questionRows.map((q) => rowToQuestion(q))
        }
      }))
    .handle("deleteExam", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1)
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        yield* runDb(
          db.delete(exams).where(and(eq(exams.id, id), eq(exams.userId, userId)))
        )
        return undefined
      }))
    .handle("duplicateExam", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient
        const sql = yield* SqlClient

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1)
        )

        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const sourceQuestions = yield* runDb(
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number)
        )

        const now = new Date()
        const newExamId = crypto.randomUUID()

        const newTitle = formatExamTitle({
          subjectLabel: resolveExamSubjectLabel({
            subject: examRow.subject,
            subjectLabel: examRow.subjectLabel
          }),
          grade: examRow.grade,
          examType: examRow.examType ?? "",
          examDate: examRow.examDate ?? null,
          topics: (examRow.topics as Array<string>) ?? []
        })

        yield* sql.withTransaction(
          Effect.gen(function*() {
            yield* runDb(
              db.insert(exams).values({
                id: newExamId,
                userId: examRow.userId,
                title: newTitle,
                subject: examRow.subject,
                subjectLabel: examRow.subjectLabel,
                grade: examRow.grade,
                difficulty: examRow.difficulty,
                topics: (examRow.topics as Array<string>) ?? [],
                reviewMode: examRow.reviewMode,
                status: "draft",
                schoolName: examRow.schoolName,
                academicYear: examRow.academicYear,
                examType: examRow.examType,
                examDate: examRow.examDate,
                durationMinutes: examRow.durationMinutes,
                instructions: examRow.instructions,
                classContext: examRow.classContext,
                discussionMd: examRow.discussionMd,
                createdAt: now,
                updatedAt: now
              })
            )

            if (sourceQuestions.length > 0) {
              yield* runDb(
                db.insert(questions).values(
                  sourceQuestions.map((q) => ({
                    id: crypto.randomUUID(),
                    examId: newExamId,
                    number: q.number,
                    text: q.text,
                    type: q.type,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                    payload: q.payload,
                    topic: q.topic,
                    difficulty: q.difficulty,
                    status: q.status,
                    validationStatus: q.validationStatus,
                    validationReason: q.validationReason,
                    createdAt: now
                  }))
                )
              )
            }
          })
        ).pipe(
          Effect.catchTag(
            "SqlError",
            (e) => Effect.fail(new ApiDatabaseError({ error: e.message, code: "DATABASE_ERROR" }))
          )
        )

        const newExamWithQuestions = yield* fetchExamWithQuestions(newExamId)
        if (!newExamWithQuestions) {
          return yield* Effect.fail(
            new ApiDatabaseError({
              error: "Failed to retrieve duplicated exam",
              code: "DATABASE_ERROR"
            })
          )
        }
        return newExamWithQuestions
      }))
    .handle("shareExam", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1)
        )

        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const slug = examRow.publicShareSlug ?? crypto.randomUUID()
        const publishedAt = examRow.publishedAt ?? new Date()

        yield* runDb(
          db
            .update(exams)
            .set({
              isPublic: true,
              publicShareSlug: slug,
              publishedAt,
              updatedAt: new Date()
            })
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
        )

        const result: ExamShareResponse = {
          slug,
          publicUrlPath: `/share/${slug}`,
          publishedAt: publishedAt.toISOString()
        }
        return result
      }))
    .handle("validateCurriculum", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const aiService = yield* AiClient

        const result = yield* validateExamCurriculum(id, userId, aiService).pipe(
          Effect.mapError(
            () =>
              new ApiDatabaseError({
                error: "Curriculum lookup failed",
                code: "DATABASE_ERROR"
              })
          )
        )
        if (!result) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }
        return result
      }))
    .handle("finalizeExam", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient

        const [examRows, questionRows] = yield* Effect.all([
          runDb(
            db.select().from(exams).where(and(eq(exams.id, id), eq(exams.userId, userId))).limit(1)
          ),
          runDb(db.select().from(questions).where(eq(questions.examId, id)))
        ])

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        if (questionRows.length === 0) {
          return yield* Effect.fail(
            new ApiFinalizeNotAllowed({
              error: "Exam has no questions to finalize",
              code: "FINALIZE_NOT_ALLOWED",
              details: { pendingCount: 0, rejectedCount: 0 }
            })
          )
        }

        const pendingCount = questionRows.filter((q) => q.status === "pending").length
        const rejectedCount = questionRows.filter((q) => q.status === "rejected").length

        if (pendingCount > 0 || rejectedCount > 0) {
          if (examRows[0]?.reviewMode === "fast") {
            yield* runDb(
              db.update(questions).set({ status: "accepted" }).where(eq(questions.examId, id))
            )
          } else {
            return yield* Effect.fail(
              new ApiFinalizeNotAllowed({
                error: "Not all questions are accepted",
                code: "FINALIZE_NOT_ALLOWED",
                details: { pendingCount, rejectedCount }
              })
            )
          }
        }

        yield* runDb(
          db
            .update(exams)
            .set({
              status: "final",
              bankedAt: new Date(),
              isPublic: true,
              updatedAt: new Date()
            })
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
        )

        const result = yield* fetchExamWithQuestions(id)
        if (!result) {
          return yield* Effect.fail(
            new ApiDatabaseError({
              error: "Failed to retrieve finalized exam",
              code: "DATABASE_ERROR"
            })
          )
        }
        return result
      }))
    .handleRaw("discussionExam", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const aiService = yield* AiClient
        const db = yield* DbClient

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1)
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }

        const exam = examRows[0]

        if (exam.status !== "final") {
          return yield* Effect.fail(
            new ApiExamNotFinal({
              error: "Exam must be finalized before generating discussion",
              code: "EXAM_NOT_FINAL"
            })
          )
        }

        if (exam.discussionMd !== null) {
          return yield* Effect.fail(
            new ApiDiscussionExists({
              error: "Discussion already exists for this exam",
              code: "DISCUSSION_ALREADY_EXISTS"
            })
          )
        }

        const questionRows = yield* runDb(
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number)
        )

        const { system, user } = buildPembahasanPrompt({
          exam: {
            subject: resolveExamSubjectLabel({
              subject: exam.subject,
              subjectLabel: exam.subjectLabel
            }),
            grade: exam.grade,
            examType: exam.examType ?? "formatif"
          },
          questions: questionRows.map((q) => rowToQuestion(q))
        })

        return runDiscussionSse(
          aiService.streamDiscussion({ system, user }),
          (discussionMd) =>
            Effect.gen(function*() {
              yield* runDb(
                db
                  .update(exams)
                  .set({ discussionMd, updatedAt: new Date() })
                  .where(and(eq(exams.id, id), eq(exams.userId, userId)))
              )
              const updated = yield* fetchExamWithQuestions(id)
              return JSON.stringify(updated ?? { error: "Failed to retrieve updated exam" })
            }).pipe(Effect.provideService(DbClient, db))
        )
      }))
    .handle("generateStream", ({ path }: { path: { id: string } }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const { id } = path
        const payload = yield* getGenerateStreamResponse(userId, id)
        if (!payload) {
          return yield* Effect.fail(
            new ApiNotFound({ error: "Exam not found", code: "NOT_FOUND" })
          )
        }
        return payload
      })))
