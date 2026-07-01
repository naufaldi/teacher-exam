import { exams, questions, user } from "@teacher-exam/db"
import type {
  BankSheet,
  BankSort,
  BrowseBankSheetsQuery,
  ExamSubject,
  PaginatedBankSheetsResponse,
  PaginatedPublicBankSheetsResponse,
  PublicBankSheet,
  UpdateBankSheetInput,
  UseBankSheetInput,
  UseBankSheetResponse
} from "@teacher-exam/shared"
import { ExamIdSchema, formatExamTitle, normalizeExamType, resolveExamSubjectLabel, UserIdSchema } from "@teacher-exam/shared"
import { and, desc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm"
import { Context, Data, Effect, Layer, Schema } from "effect"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class BankNotFoundError extends Data.TaggedError("BankNotFoundError")<{
  id: string
}> {}

export class BankBuildError extends Data.TaggedError("BankBuildError")<{
  code: "TOO_FEW" | "TOO_MANY" | "UNOWNED"
  message: string
}> {}

export interface BankServiceApi {
  readonly browseSheets: (
    userId: string,
    query: BrowseBankSheetsQuery
  ) => Effect.Effect<PaginatedBankSheetsResponse, ApiDatabaseError>
  readonly browsePublicSheets: (
    query: BrowseBankSheetsQuery,
    excludeUserId?: string
  ) => Effect.Effect<PaginatedPublicBankSheetsResponse, ApiDatabaseError>
  readonly updateSheet: (
    userId: string,
    examId: string,
    input: UpdateBankSheetInput
  ) => Effect.Effect<BankSheet, BankNotFoundError | ApiDatabaseError>
  readonly useSheet: (
    userId: string,
    input: UseBankSheetInput
  ) => Effect.Effect<UseBankSheetResponse, BankBuildError | ApiDatabaseError>
  readonly getSheet: (
    userId: string,
    examId: string
  ) => Effect.Effect<BankSheet, BankNotFoundError | ApiDatabaseError>
  readonly getPublicSheet: (
    examId: string
  ) => Effect.Effect<PublicBankSheet, BankNotFoundError | ApiDatabaseError>
}

function resolveSheetOrderBy(sort: BankSort | undefined) {
  if (sort === "kesulitan") {
    return sql`CASE ${exams.difficulty}
      WHEN 'mudah' THEN 1
      WHEN 'sedang' THEN 2
      WHEN 'sulit' THEN 3
      ELSE 4 END ASC`
  }
  if (sort === "terpopuler") {
    return desc(exams.createdAt)
  }
  return desc(exams.bankedAt)
}

function appendSheetBrowseFilters(
  conditions: Array<ReturnType<typeof eq> | ReturnType<typeof isNotNull>>,
  query: BrowseBankSheetsQuery
) {
  if (query.subject) {
    conditions.push(eq(exams.subject, query.subject))
  }
  if (query.grade !== undefined) {
    conditions.push(eq(exams.grade, query.grade))
  }
  if (query.difficulty) {
    conditions.push(eq(exams.difficulty, query.difficulty))
  }
  if (query.topic) {
    conditions.push(sql`${exams.topics} @> ${JSON.stringify([query.topic])}::jsonb`)
  }
  if (query.search) {
    const searchTerm = `%${query.search.toLowerCase()}%`
    conditions.push(
      or(
        sql`LOWER(${exams.title}) LIKE ${searchTerm}`,
        sql`EXISTS (
          SELECT 1 FROM ${questions}
          WHERE ${questions.examId} = ${exams.id}
          AND LOWER(${questions.text}) LIKE ${searchTerm}
        )`
      )!
    )
  }
}

function toBankSheet(
  row: typeof exams.$inferSelect,
  questionCount: number
): BankSheet {
  return {
    id: Schema.decodeSync(ExamIdSchema)(row.id),
    userId: Schema.decodeSync(UserIdSchema)(row.userId),
    title: row.title,
    subject: row.subject,
    subjectLabel: row.subjectLabel,
    grade: row.grade,
    difficulty: row.difficulty,
    topics: row.topics as Array<string>,
    examType: normalizeExamType(row.examType),
    status: "final",
    isPublic: row.isPublic,
    questionCount,
    bankedAt: (row.bankedAt ?? row.updatedAt).toISOString(),
    createdAt: row.createdAt.toISOString()
  }
}

function toPublicBankSheet(
  row: typeof exams.$inferSelect,
  questionCount: number,
  authorName: string
): PublicBankSheet {
  return {
    id: Schema.decodeSync(ExamIdSchema)(row.id),
    title: row.title,
    subject: row.subject,
    subjectLabel: row.subjectLabel,
    grade: row.grade,
    difficulty: row.difficulty,
    topics: row.topics as Array<string>,
    examType: normalizeExamType(row.examType),
    status: "final",
    isPublic: row.isPublic,
    questionCount,
    authorName,
    bankedAt: (row.bankedAt ?? row.updatedAt).toISOString(),
    createdAt: row.createdAt.toISOString()
  }
}

export class BankService extends Context.Tag("BankService")<
  BankService,
  BankServiceApi
>() {}

export const BankServiceLive = Layer.effect(
  BankService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const loadQuestionCounts = (
      examIds: ReadonlyArray<string>
    ): Effect.Effect<Map<string, number>, ApiDatabaseError> =>
      Effect.gen(function*() {
        if (examIds.length === 0) {
          return new Map<string, number>()
        }

        const countRows = yield* runDb(
          db
            .select({
              examId: questions.examId,
              questionCount: sql<number>`count(*)::int`
            })
            .from(questions)
            .where(and(inArray(questions.examId, [...examIds]), eq(questions.status, "accepted")))
            .groupBy(questions.examId)
        )

        return new Map(countRows.map((row) => [row.examId, row.questionCount]))
      }).pipe(Effect.provideService(DbClient, db))

    const browseSheets = (
      userId: string,
      query: BrowseBankSheetsQuery
    ): Effect.Effect<PaginatedBankSheetsResponse, ApiDatabaseError> =>
      Effect.gen(function*() {
        const page = query.page ?? 1
        const limit = query.limit ?? 20
        const offset = (page - 1) * limit

        const conditions = [
          eq(exams.userId, userId),
          eq(exams.status, "final"),
          isNotNull(exams.bankedAt)
        ]
        appendSheetBrowseFilters(conditions, query)
        const whereClause = and(...conditions)

        const countRows = yield* runDb(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(exams)
            .where(whereClause!)
        )
        const total = countRows[0]?.count ?? 0

        const rows = yield* runDb(
          db
            .select({ exam: exams })
            .from(exams)
            .where(whereClause!)
            .orderBy(resolveSheetOrderBy(query.sort))
            .limit(limit)
            .offset(offset)
        )

        const questionCounts = yield* loadQuestionCounts(rows.map((row) => row.exam.id))

        return {
          data: rows.map((row) => toBankSheet(row.exam, questionCounts.get(row.exam.id) ?? 0)),
          total,
          page,
          limit
        }
      }).pipe(Effect.provideService(DbClient, db))

    const browsePublicSheets = (
      query: BrowseBankSheetsQuery,
      excludeUserId?: string
    ): Effect.Effect<PaginatedPublicBankSheetsResponse, ApiDatabaseError> =>
      Effect.gen(function*() {
        const page = query.page ?? 1
        const limit = query.limit ?? 20
        const offset = (page - 1) * limit

        const conditions = [
          eq(exams.status, "final"),
          eq(exams.isPublic, true),
          isNotNull(exams.bankedAt)
        ]
        if (excludeUserId) {
          conditions.push(ne(exams.userId, excludeUserId))
        }
        appendSheetBrowseFilters(conditions, query)
        if (query.author) {
          const authorTerm = `%${query.author.toLowerCase()}%`
          conditions.push(
            or(
              sql`LOWER(${user.name}) LIKE ${authorTerm}`,
              sql`LOWER(${user.username}) LIKE ${authorTerm}`
            )!
          )
        }
        const whereClause = and(...conditions)

        const countRows = yield* runDb(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(exams)
            .innerJoin(user, eq(exams.userId, user.id))
            .where(whereClause!)
        )
        const total = countRows[0]?.count ?? 0

        const rows = yield* runDb(
          db
            .select({
              exam: exams,
              authorName: user.name
            })
            .from(exams)
            .innerJoin(user, eq(exams.userId, user.id))
            .where(whereClause!)
            .orderBy(resolveSheetOrderBy(query.sort))
            .limit(limit)
            .offset(offset)
        )

        const questionCounts = yield* loadQuestionCounts(rows.map((row) => row.exam.id))

        return {
          data: rows.map((row) =>
            toPublicBankSheet(
              row.exam,
              questionCounts.get(row.exam.id) ?? 0,
              row.authorName
            )
          ),
          total,
          page,
          limit
        }
      }).pipe(Effect.provideService(DbClient, db))

    const updateSheet = (
      userId: string,
      examId: string,
      input: UpdateBankSheetInput
    ): Effect.Effect<BankSheet, BankNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const existingRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(
              and(
                eq(exams.id, examId),
                eq(exams.userId, userId),
                eq(exams.status, "final"),
                isNotNull(exams.bankedAt)
              )
            )
            .limit(1)
        )

        if (!existingRows[0]) {
          return yield* Effect.fail(new BankNotFoundError({ id: examId }))
        }

        if (input.isPublic !== undefined) {
          yield* runDb(
            db
              .update(exams)
              .set({ isPublic: input.isPublic, updatedAt: new Date() })
              .where(eq(exams.id, examId))
          )
        }

        const updatedRows = yield* runDb(
          db.select().from(exams).where(eq(exams.id, examId)).limit(1)
        )

        const updatedExam = updatedRows[0]
        if (!updatedExam) {
          return yield* Effect.fail(new BankNotFoundError({ id: examId }))
        }

        const questionCounts = yield* loadQuestionCounts([examId])

        return toBankSheet(updatedExam, questionCounts.get(examId) ?? 0)
      }).pipe(Effect.provideService(DbClient, db))

    const useSheet = (
      userId: string,
      input: UseBankSheetInput
    ): Effect.Effect<UseBankSheetResponse, BankBuildError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const sourceRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(
              and(
                eq(exams.id, input.sourceExamId),
                eq(exams.status, "final"),
                isNotNull(exams.bankedAt)
              )
            )
            .limit(1)
        )

        const sourceExam = sourceRows[0]
        if (!sourceExam) {
          return yield* Effect.fail(
            new BankBuildError({
              code: "UNOWNED",
              message: "Lembar tidak ditemukan di bank"
            })
          )
        }

        if (sourceExam.userId !== userId && !sourceExam.isPublic) {
          return yield* Effect.fail(
            new BankBuildError({
              code: "UNOWNED",
              message: "Lembar tidak tersedia"
            })
          )
        }

        const sourceQuestions = yield* runDb(
          db
            .select()
            .from(questions)
            .where(
              and(eq(questions.examId, input.sourceExamId), eq(questions.status, "accepted"))
            )
            .orderBy(questions.number)
        )

        if (sourceQuestions.length === 0) {
          return yield* Effect.fail(
            new BankBuildError({
              code: "TOO_FEW",
              message: "Lembar tidak memiliki soal"
            })
          )
        }

        const now = new Date()
        const newExamId = crypto.randomUUID()
        const newTitle = formatExamTitle({
          subjectLabel: resolveExamSubjectLabel({
            subject: sourceExam.subject,
            subjectLabel: sourceExam.subjectLabel
          }),
          grade: sourceExam.grade,
          examType: sourceExam.examType ?? "",
          examDate: sourceExam.examDate ?? null,
          topics: (sourceExam.topics as Array<string>) ?? []
        })

        yield* runDb(
          db.insert(exams).values({
            id: newExamId,
            userId,
            title: newTitle,
            subject: sourceExam.subject,
            subjectLabel: sourceExam.subjectLabel,
            grade: sourceExam.grade,
            difficulty: sourceExam.difficulty,
            topics: (sourceExam.topics as Array<string>) ?? [],
            reviewMode: sourceExam.reviewMode,
            status: "draft",
            schoolName: sourceExam.schoolName,
            academicYear: sourceExam.academicYear,
            examType: sourceExam.examType,
            examDate: sourceExam.examDate,
            durationMinutes: sourceExam.durationMinutes,
            instructions: sourceExam.instructions,
            classContext: sourceExam.classContext,
            discussionMd: sourceExam.discussionMd,
            createdAt: now,
            updatedAt: now
          })
        )

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
              status: "accepted" as const,
              validationStatus: q.validationStatus,
              validationReason: q.validationReason,
              createdAt: now
            }))
          )
        )

        return { examId: newExamId as UseBankSheetResponse["examId"] }
      }).pipe(Effect.provideService(DbClient, db))

    const fetchBankedSheetRow = (
      examId: string,
      viewerUserId?: string
    ): Effect.Effect<
      { exam: typeof exams.$inferSelect; questionCount: number; authorName: string | null },
      BankNotFoundError | ApiDatabaseError
    > =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db
            .select({
              exam: exams,
              authorName: user.name
            })
            .from(exams)
            .leftJoin(user, eq(exams.userId, user.id))
            .where(
              and(
                eq(exams.id, examId),
                eq(exams.status, "final"),
                isNotNull(exams.bankedAt)
              )
            )
            .limit(1)
        )

        const row = rows[0]
        if (!row) {
          return yield* Effect.fail(new BankNotFoundError({ id: examId }))
        }

        const isOwner = viewerUserId !== undefined && row.exam.userId === viewerUserId
        if (!isOwner && !row.exam.isPublic) {
          return yield* Effect.fail(new BankNotFoundError({ id: examId }))
        }

        const questionCounts = yield* loadQuestionCounts([examId])

        return {
          exam: row.exam,
          questionCount: questionCounts.get(examId) ?? 0,
          authorName: row.authorName
        }
      }).pipe(Effect.provideService(DbClient, db))

    const getSheet = (
      userId: string,
      examId: string
    ): Effect.Effect<BankSheet, BankNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchBankedSheetRow(examId, userId)
        if (row.exam.userId !== userId) {
          return yield* Effect.fail(new BankNotFoundError({ id: examId }))
        }
        return toBankSheet(row.exam, row.questionCount)
      }).pipe(Effect.provideService(DbClient, db))

    const getPublicSheet = (
      examId: string
    ): Effect.Effect<PublicBankSheet, BankNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchBankedSheetRow(examId)
        if (!row.exam.isPublic) {
          return yield* Effect.fail(new BankNotFoundError({ id: examId }))
        }
        return toPublicBankSheet(row.exam, row.questionCount, row.authorName ?? "Guru")
      }).pipe(Effect.provideService(DbClient, db))

    return {
      browseSheets,
      browsePublicSheets,
      updateSheet,
      useSheet,
      getSheet,
      getPublicSheet
    }
  })
)
