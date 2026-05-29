import { Context, Data, Effect, Layer } from 'effect'
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm'
import { bankQuestions, exams, questions, user } from '@teacher-exam/db'
import type {
  SaveToBankInput,
  BrowseBankQuery,
  BankQuestion,
  PaginatedBankResponse,
  PaginatedPublicBankResponse,
  PublicBankQuestion,
  UpdateBankQuestionInput,
  ExamDifficulty,
  BankSort,
  BuildExamFromBankInput,
  BuildExamFromBankResponse,
  ExamSubject,
} from '@teacher-exam/shared'
import { formatExamTitle, SUBJECT_LABEL } from '@teacher-exam/shared'
import { DbClient } from './db'
import { runDb } from '../lib/db-effect'
import { ApiDatabaseError } from '../errors/http'

export class BankSaveError extends Data.TaggedError('BankSaveError')<{
  cause: unknown
}> {}

export class BankNotFoundError extends Data.TaggedError('BankNotFoundError')<{
  id: string
}> {}

export class BankBuildError extends Data.TaggedError('BankBuildError')<{
  code: 'TOO_FEW' | 'TOO_MANY' | 'UNOWNED'
  message: string
}> {}

export interface BankServiceApi {
  readonly saveQuestion: (
    userId: string,
    input: SaveToBankInput,
  ) => Effect.Effect<BankQuestion, BankSaveError | ApiDatabaseError, DbClient>
  readonly browseOwn: (
    userId: string,
    query: BrowseBankQuery,
  ) => Effect.Effect<PaginatedBankResponse, ApiDatabaseError, DbClient>
  readonly update: (
    userId: string,
    id: string,
    input: UpdateBankQuestionInput,
  ) => Effect.Effect<BankQuestion, BankNotFoundError | ApiDatabaseError, DbClient>
  readonly remove: (
    userId: string,
    id: string,
  ) => Effect.Effect<void, BankNotFoundError | ApiDatabaseError, DbClient>
  readonly autoSaveAccepted: (
    userId: string,
    examId: string,
  ) => Effect.Effect<number, BankSaveError | ApiDatabaseError, DbClient>
  readonly propagatePublish: (
    userId: string,
    examId: string,
  ) => Effect.Effect<number, never, DbClient>
  readonly browsePublic: (
    query: BrowseBankQuery,
    excludeUserId?: string,
  ) => Effect.Effect<PaginatedPublicBankResponse, ApiDatabaseError, DbClient>
  readonly buildExam: (
    userId: string,
    input: BuildExamFromBankInput,
  ) => Effect.Effect<BuildExamFromBankResponse, BankBuildError | ApiDatabaseError, DbClient>
}

function resolveBankDifficulty(
  questionDifficulty: string | null,
  examDifficulty: ExamDifficulty,
): ExamDifficulty {
  if (
    questionDifficulty === 'mudah' ||
    questionDifficulty === 'sedang' ||
    questionDifficulty === 'sulit' ||
    questionDifficulty === 'campuran'
  ) {
    return questionDifficulty
  }
  return examDifficulty
}

function resolveOrderBy(sort: BankSort | undefined) {
  if (sort === 'terpopuler') {
    return desc(bankQuestions.usageCount)
  }
  if (sort === 'kesulitan') {
    return sql`CASE ${bankQuestions.difficulty}
      WHEN 'mudah' THEN 1
      WHEN 'sedang' THEN 2
      WHEN 'sulit' THEN 3
      ELSE 4 END ASC`
  }
  return desc(bankQuestions.createdAt)
}

function appendBrowseFilters(conditions: ReturnType<typeof eq>[], query: BrowseBankQuery) {
  if (query.subject) {
    conditions.push(eq(bankQuestions.subject, query.subject))
  }
  if (query.grade !== undefined) {
    conditions.push(eq(bankQuestions.grade, query.grade))
  }
  if (query.difficulty) {
    conditions.push(eq(bankQuestions.difficulty, query.difficulty))
  }
  if (query.type) {
    conditions.push(eq(bankQuestions.type, query.type))
  }
  if (query.topic) {
    conditions.push(
      sql`${bankQuestions.topics} @> ${JSON.stringify([query.topic])}::jsonb`,
    )
  }
  if (query.search) {
    const searchTerm = `%${query.search.toLowerCase()}%`
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${questions}
      WHERE ${questions.id} = ${bankQuestions.questionId}
      AND LOWER(${questions.text}) LIKE ${searchTerm}
    )`)
  }
}

function toPublicBankQuestion(
  bankRow: typeof bankQuestions.$inferSelect,
  authorName: string,
  questionRow: {
    text: string
    optionA: string | null
    optionB: string | null
    optionC: string | null
    optionD: string | null
    correctAnswer: string | null
  } | null,
): PublicBankQuestion {
  const base: PublicBankQuestion = {
    id: bankRow.id as PublicBankQuestion['id'],
    questionId: bankRow.questionId as PublicBankQuestion['questionId'],
    authorName,
    subject: bankRow.subject as PublicBankQuestion['subject'],
    grade: bankRow.grade,
    topics: bankRow.topics ?? [],
    difficulty: bankRow.difficulty as PublicBankQuestion['difficulty'],
    type: bankRow.type,
    payload: bankRow.payload,
    usageCount: bankRow.usageCount,
    createdAt: bankRow.createdAt.toISOString(),
    text: '',
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer: null,
  }
  if (!questionRow) {
    return base
  }
  return {
    ...base,
    text: questionRow.text,
    optionA: questionRow.optionA,
    optionB: questionRow.optionB,
    optionC: questionRow.optionC,
    optionD: questionRow.optionD,
    correctAnswer: questionRow.correctAnswer as PublicBankQuestion['correctAnswer'],
  }
}

export class BankService extends Context.Tag('BankService')<
  BankService,
  BankServiceApi
>() {}

function toBankQuestion(row: typeof bankQuestions.$inferSelect): BankQuestion {
  return {
    id: row.id as BankQuestion['id'],
    questionId: row.questionId as BankQuestion['questionId'],
    userId: row.userId,
    subject: row.subject as BankQuestion['subject'],
    grade: row.grade,
    topics: row.topics ?? [],
    difficulty: row.difficulty as BankQuestion['difficulty'],
    type: row.type,
    payload: row.payload,
    isPublic: row.isPublic,
    usageCount: row.usageCount,
    createdAt: row.createdAt.toISOString(),
    text: '',
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer: null,
  }
}

function toBankQuestionWithDetails(
  bankRow: typeof bankQuestions.$inferSelect,
  questionRow: {
    text: string
    optionA: string | null
    optionB: string | null
    optionC: string | null
    optionD: string | null
    correctAnswer: string | null
  } | null,
): BankQuestion {
  const base = toBankQuestion(bankRow)
  if (!questionRow) {
    return base
  }
  return {
    ...base,
    text: questionRow.text,
    optionA: questionRow.optionA,
    optionB: questionRow.optionB,
    optionC: questionRow.optionC,
    optionD: questionRow.optionD,
    correctAnswer: questionRow.correctAnswer as BankQuestion['correctAnswer'],
  }
}

export const BankServiceLive = Layer.effect(
  BankService,
  Effect.gen(function* () {
    const saveQuestion = (
      userId: string,
      input: SaveToBankInput,
    ): Effect.Effect<BankQuestion, BankSaveError | ApiDatabaseError, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient

        const questionRows = yield* runDb(
          db
            .select({
              id: questions.id,
              examId: questions.examId,
              text: questions.text,
              optionA: questions.optionA,
              optionB: questions.optionB,
              optionC: questions.optionC,
              optionD: questions.optionD,
              correctAnswer: questions.correctAnswer,
              type: questions.type,
              payload: questions.payload,
              topic: questions.topic,
              difficulty: questions.difficulty,
            })
            .from(questions)
            .innerJoin(exams, eq(questions.examId, exams.id))
            .where(and(eq(questions.id, input.questionId), eq(exams.userId, userId)))
            .limit(1),
        )

        const questionRow = questionRows[0]
        if (!questionRow) {
          return yield* Effect.fail(new BankSaveError({ cause: 'Question not found or not owned' }))
        }

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(eq(exams.id, questionRow.examId))
            .limit(1),
        )
        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(new BankSaveError({ cause: 'Exam not found' }))
        }

        const result = yield* Effect.either(
          runDb(
            db
              .insert(bankQuestions)
              .values({
                id: crypto.randomUUID(),
                userId,
                questionId: questionRow.id,
                subject: examRow.subject as typeof bankQuestions.subject.enumValues[number],
                grade: examRow.grade,
                topics: questionRow.topic ? [questionRow.topic] : [],
                difficulty: resolveBankDifficulty(questionRow.difficulty, examRow.difficulty as ExamDifficulty),
                type: questionRow.type,
                payload: questionRow.payload ?? {},
                isPublic: false,
                usageCount: 0,
              })
              .onConflictDoNothing({ target: [bankQuestions.userId, bankQuestions.questionId] })
              .returning(),
          ),
        )

        let bankRow: typeof bankQuestions.$inferSelect | undefined
        if (result._tag === 'Right' && result.right[0]) {
          bankRow = result.right[0]
        } else {
          const existingRows = yield* runDb(
            db
              .select()
              .from(bankQuestions)
              .where(
                and(eq(bankQuestions.userId, userId), eq(bankQuestions.questionId, questionRow.id)),
              )
              .limit(1),
          )
          bankRow = existingRows[0]
        }

        if (!bankRow) {
          return yield* Effect.fail(new BankSaveError({ cause: 'Failed to save to bank' }))
        }

        return toBankQuestionWithDetails(bankRow, questionRow)
      })

    const browseOwn = (
      userId: string,
      query: BrowseBankQuery,
    ): Effect.Effect<PaginatedBankResponse, ApiDatabaseError, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient
        const page = query.page ?? 1
        const limit = query.limit ?? 20
        const offset = (page - 1) * limit

        const conditions = [eq(bankQuestions.userId, userId)]
        appendBrowseFilters(conditions, query)
        const whereClause = and(...conditions)

        const countRows = yield* runDb(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(bankQuestions)
            .where(whereClause!),
        )
        const total = countRows[0]?.count ?? 0

        const rows = yield* runDb(
          db
            .select()
            .from(bankQuestions)
            .where(whereClause!)
            .orderBy(resolveOrderBy(query.sort))
            .limit(limit)
            .offset(offset),
        )

        const data: BankQuestion[] = []
        for (const row of rows) {
          const questionRows = yield* runDb(
            db
              .select()
              .from(questions)
              .where(eq(questions.id, row.questionId))
              .limit(1),
          )
          const questionRow = questionRows[0] ?? null
          data.push(toBankQuestionWithDetails(row, questionRow))
        }

        return {
          data,
          total,
          page,
          limit,
        }
      })

    const update = (
      userId: string,
      id: string,
      input: UpdateBankQuestionInput,
    ): Effect.Effect<BankQuestion, BankNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient

        const existingRows = yield* runDb(
          db
            .select()
            .from(bankQuestions)
            .where(and(eq(bankQuestions.id, id), eq(bankQuestions.userId, userId)))
            .limit(1),
        )

        if (!existingRows[0]) {
          return yield* Effect.fail(new BankNotFoundError({ id }))
        }

        const updateData: Record<string, unknown> = {}
        if (input.isPublic !== undefined) {
          updateData['isPublic'] = input.isPublic
        }

        if (Object.keys(updateData).length > 0) {
          yield* runDb(
            db.update(bankQuestions).set(updateData).where(eq(bankQuestions.id, id)),
          )
        }

        const updatedRows = yield* runDb(
          db
            .select()
            .from(bankQuestions)
            .where(eq(bankQuestions.id, id))
            .limit(1),
        )

        const bankRow = updatedRows[0]
        if (!bankRow) {
          return yield* Effect.fail(new BankNotFoundError({ id }))
        }

        const questionRows = yield* runDb(
          db
            .select()
            .from(questions)
            .where(eq(questions.id, bankRow.questionId))
            .limit(1),
        )
        const questionRow = questionRows[0] ?? null

        return toBankQuestionWithDetails(bankRow, questionRow)
      })

    const remove = (
      userId: string,
      id: string,
    ): Effect.Effect<void, BankNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient

        const existingRows = yield* runDb(
          db
            .select()
            .from(bankQuestions)
            .where(and(eq(bankQuestions.id, id), eq(bankQuestions.userId, userId)))
            .limit(1),
        )

        if (!existingRows[0]) {
          return yield* Effect.fail(new BankNotFoundError({ id }))
        }

        yield* runDb(db.delete(bankQuestions).where(eq(bankQuestions.id, id)))
      })

    const autoSaveAccepted = (
      userId: string,
      examId: string,
    ): Effect.Effect<number, BankSaveError | ApiDatabaseError, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient

        const acceptedQuestions = yield* runDb(
          db
            .select({
              id: questions.id,
              text: questions.text,
              optionA: questions.optionA,
              optionB: questions.optionB,
              optionC: questions.optionC,
              optionD: questions.optionD,
              correctAnswer: questions.correctAnswer,
              type: questions.type,
              payload: questions.payload,
              topic: questions.topic,
              difficulty: questions.difficulty,
            })
            .from(questions)
            .where(and(eq(questions.examId, examId), eq(questions.status, 'accepted'))),
        )

        if (acceptedQuestions.length === 0) {
          return 0
        }

        const examRows = yield* runDb(
          db.select().from(exams).where(eq(exams.id, examId)).limit(1),
        )
        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(new BankSaveError({ cause: 'Exam not found' }))
        }

        const bankValues = acceptedQuestions.map((q) => ({
          id: crypto.randomUUID(),
          userId,
          questionId: q.id,
          subject: examRow.subject as typeof bankQuestions.subject.enumValues[number],
          grade: examRow.grade,
          topics: q.topic ? [q.topic] : [],
          difficulty: resolveBankDifficulty(q.difficulty, examRow.difficulty as ExamDifficulty),
          type: q.type,
          payload: q.payload ?? {},
          isPublic: false,
          usageCount: 0,
        }))

        const result = yield* Effect.either(
          runDb(
            db
              .insert(bankQuestions)
              .values(bankValues)
              .onConflictDoNothing({ target: [bankQuestions.userId, bankQuestions.questionId] }),
          ),
        )

        if (result._tag === 'Left') {
          return yield* Effect.fail(new BankSaveError({ cause: result.left }))
        }

        return acceptedQuestions.length
      })

    const propagatePublish = (
      userId: string,
      examId: string,
    ): Effect.Effect<number, never, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient

        const examRows = yield* runDb(
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, examId), eq(exams.userId, userId)))
            .limit(1),
        )

        if (!examRows[0]) {
          return 0
        }

        const questionIds = yield* runDb(
          db.select({ id: questions.id }).from(questions).where(eq(questions.examId, examId)),
        )

        if (questionIds.length === 0) {
          return 0
        }

        const result = yield* runDb(
          db
            .update(bankQuestions)
            .set({ isPublic: true })
            .where(
              and(
                eq(bankQuestions.userId, userId),
                inArray(
                  bankQuestions.questionId,
                  questionIds.map((q) => q.id),
                ),
              ),
            )
            .returning(),
        )

        return result.length
      }).pipe(Effect.catchAll(() => Effect.succeed(0)))

    const browsePublic = (
      query: BrowseBankQuery,
      excludeUserId?: string,
    ): Effect.Effect<PaginatedPublicBankResponse, ApiDatabaseError, DbClient> =>
      Effect.gen(function* () {
        const db = yield* DbClient
        const page = query.page ?? 1
        const limit = query.limit ?? 20
        const offset = (page - 1) * limit

        const conditions = [eq(bankQuestions.isPublic, true)]
        if (excludeUserId) {
          conditions.push(ne(bankQuestions.userId, excludeUserId))
        }
        appendBrowseFilters(conditions, query)
        if (query.author) {
          const authorTerm = `%${query.author.toLowerCase()}%`
          conditions.push(
            or(
              sql`LOWER(${user.name}) LIKE ${authorTerm}`,
              sql`LOWER(${user.username}) LIKE ${authorTerm}`,
            )!,
          )
        }
        const whereClause = and(...conditions)

        const countRows = yield* runDb(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(bankQuestions)
            .innerJoin(user, eq(bankQuestions.userId, user.id))
            .where(whereClause!),
        )
        const total = countRows[0]?.count ?? 0

        const rows = yield* runDb(
          db
            .select({
              bank: bankQuestions,
              authorName: user.name,
            })
            .from(bankQuestions)
            .innerJoin(user, eq(bankQuestions.userId, user.id))
            .where(whereClause!)
            .orderBy(resolveOrderBy(query.sort))
            .limit(limit)
            .offset(offset),
        )

        const data: PublicBankQuestion[] = []
        for (const row of rows) {
          const questionRows = yield* runDb(
            db
              .select()
              .from(questions)
              .where(eq(questions.id, row.bank.questionId))
              .limit(1),
          )
          const questionRow = questionRows[0] ?? null
          data.push(toPublicBankQuestion(row.bank, row.authorName, questionRow))
        }

        return {
          data,
          total,
          page,
          limit,
        }
      })

    const buildExam = (
      userId: string,
      input: BuildExamFromBankInput,
    ): Effect.Effect<
      BuildExamFromBankResponse,
      BankBuildError | ApiDatabaseError,
      DbClient
    > =>
      Effect.gen(function* () {
        const db = yield* DbClient

        if (input.bankQuestionIds.length < 5) {
          return yield* Effect.fail(
            new BankBuildError({
              code: 'TOO_FEW',
              message: 'Minimal 5 soal diperlukan',
            }),
          )
        }
        if (input.bankQuestionIds.length > 50) {
          return yield* Effect.fail(
            new BankBuildError({
              code: 'TOO_MANY',
              message: 'Maksimal 50 soal',
            }),
          )
        }

        const bankRows = yield* runDb(
          db
            .select()
            .from(bankQuestions)
            .where(
              and(
                eq(bankQuestions.userId, userId),
                inArray(bankQuestions.id, input.bankQuestionIds),
              ),
            ),
        )

        if (bankRows.length !== input.bankQuestionIds.length) {
          return yield* Effect.fail(
            new BankBuildError({
              code: 'UNOWNED',
              message: 'Satu atau lebih soal tidak ditemukan di bank Anda',
            }),
          )
        }

        const orderedRows = input.bankQuestionIds
          .map((id) => bankRows.find((row) => row.id === id))
          .filter((row): row is typeof bankQuestions.$inferSelect => row !== undefined)

        const questionDetails = yield* runDb(
          db
            .select()
            .from(questions)
            .where(
              inArray(
                questions.id,
                orderedRows.map((row) => row.questionId),
              ),
            ),
        )
        const questionById = new Map(questionDetails.map((q) => [q.id, q]))

        const now = new Date()
        const newExamId = crypto.randomUUID()
        const meta = input.metadata
        const difficulty = meta.difficulty ?? 'sedang'
        const topicList = [...(meta.topics ?? orderedRows.flatMap((row) => row.topics).slice(0, 5))]
        const title = formatExamTitle({
          subjectLabel: SUBJECT_LABEL[meta.subject as ExamSubject] ?? meta.subject,
          grade: meta.grade,
          examType: meta.examType ?? 'latihan',
          examDate: meta.examDate ?? null,
          topics: topicList,
        })

        yield* runDb(
          db.insert(exams).values({
            id: newExamId,
            userId,
            title,
            subject: meta.subject,
            grade: meta.grade,
            difficulty,
            topics: topicList,
            reviewMode: 'fast',
            status: 'draft',
            schoolName: meta.schoolName ?? null,
            academicYear: meta.academicYear ?? null,
            examType: meta.examType ?? 'latihan',
            examDate: meta.examDate ?? null,
            durationMinutes: meta.durationMinutes ?? null,
            instructions: meta.instructions ?? null,
            classContext: meta.classContext ?? null,
            createdAt: now,
            updatedAt: now,
          }),
        )

        yield* runDb(
          db.insert(questions).values(
            orderedRows.map((bankRow, index) => {
              const source = questionById.get(bankRow.questionId)
              const payload =
                typeof bankRow.payload === 'object' && bankRow.payload !== null
                  ? { ...(bankRow.payload as Record<string, unknown>), source: 'bank' }
                  : { source: 'bank' }
              return {
                id: crypto.randomUUID(),
                examId: newExamId,
                number: index + 1,
                text: source?.text ?? '',
                type: bankRow.type,
                optionA: source?.optionA ?? null,
                optionB: source?.optionB ?? null,
                optionC: source?.optionC ?? null,
                optionD: source?.optionD ?? null,
                correctAnswer: source?.correctAnswer ?? null,
                payload,
                topic: source?.topic ?? bankRow.topics[0] ?? null,
                difficulty: source?.difficulty ?? bankRow.difficulty,
                status: 'accepted' as const,
                validationStatus: source?.validationStatus ?? null,
                validationReason: source?.validationReason ?? null,
                createdAt: now,
              }
            }),
          ),
        )

        for (const bankRow of orderedRows) {
          yield* runDb(
            db
              .update(bankQuestions)
              .set({ usageCount: bankRow.usageCount + 1 })
              .where(eq(bankQuestions.id, bankRow.id)),
          )
        }

        return { examId: newExamId as BuildExamFromBankResponse['examId'] }
      })

    return {
      saveQuestion,
      browseOwn,
      update,
      remove,
      autoSaveAccepted,
      propagatePublish,
      browsePublic,
      buildExam,
    }
  }),
)
