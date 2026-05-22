import { HttpApiBuilder } from '@effect/platform'
import { Effect, Layer, Schema, Match } from 'effect'
import { eq, and, desc } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { UpdateExamInputSchema, formatExamTitle, SUBJECT_LABEL } from '@teacher-exam/shared'
import type { ExamShareResponse, ExamWithQuestions, ExamSubject } from '@teacher-exam/shared'
import { toExam, fetchExamWithQuestions } from '../../lib/exams-query'
import { rowToQuestion } from '../../lib/question-mapper'
import { buildPembahasanPrompt } from '../../lib/pembahasan-prompt'
import { validateExamCurriculum } from '../../lib/validate-exam-curriculum'
import { TeacherExamApi } from '../definition'
import {
  ApiDatabaseError,
  ApiDiscussionExists,
  ApiExamNotFinal,
  ApiFinalizeNotAllowed,
  ApiNotFound,
  ApiValidationError422,
} from '../errors/http'
import { CurrentUser } from '../middleware/auth'
import { tryDb } from '../lib/db-effect'
import { AiClient } from '../services/ai'

export const ExamsLive = HttpApiBuilder.group(TeacherExamApi, 'exams', (handlers) =>
  handlers
    .handle('listExams', () =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const rows = yield* tryDb(() =>
          db.select().from(exams).where(eq(exams.userId, userId)).orderBy(desc(exams.createdAt)),
        )
        return rows.map((r) => toExam(r))
      }),
    )
    .handle('getExam', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path

        const examRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        const questionRows = yield* tryDb(() =>
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number),
        )

        const result: ExamWithQuestions = {
          ...toExam(examRow),
          questions: questionRows.map((q) => rowToQuestion(q)),
        }
        return result
      }),
    )
    .handle('patchExam', ({ path, payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path

        const decode = Schema.decodeUnknownEither(UpdateExamInputSchema)
        const parsed = decode(payload)
        if (parsed._tag === 'Left') {
          return yield* Effect.fail(
            new ApiValidationError422({
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: String(parsed.left),
            }),
          )
        }
        const input = parsed.right

        const examRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() }
        if (input.title !== undefined) updateData['title'] = input.title
        if (input.schoolName !== undefined) updateData['schoolName'] = input.schoolName
        if (input.academicYear !== undefined) updateData['academicYear'] = input.academicYear
        if (input.examType !== undefined) updateData['examType'] = input.examType
        if (input.examDate !== undefined) updateData['examDate'] = input.examDate
        if (input.durationMinutes !== undefined) updateData['durationMinutes'] = input.durationMinutes
        if (input.instructions !== undefined) updateData['instructions'] = input.instructions
        if (input.classContext !== undefined) updateData['classContext'] = input.classContext
        if (input.status !== undefined) updateData['status'] = input.status
        if (input.reviewMode !== undefined) updateData['reviewMode'] = input.reviewMode

        yield* tryDb(() =>
          db.update(exams).set(updateData).where(and(eq(exams.id, id), eq(exams.userId, userId))),
        )

        const updatedRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        const updatedRow = updatedRows[0]
        if (!updatedRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        const questionRows = yield* tryDb(() =>
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number),
        )

        return {
          ...toExam(updatedRow),
          questions: questionRows.map((q) => rowToQuestion(q)),
        }
      }),
    )
    .handle('deleteExam', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path

        const examRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        yield* tryDb(() =>
          db.delete(exams).where(and(eq(exams.id, id), eq(exams.userId, userId))),
        )
        return undefined
      }),
    )
    .handle('duplicateExam', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path

        const examRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        const sourceQuestions = yield* tryDb(() =>
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number),
        )

        const now = new Date()
        const newExamId = crypto.randomUUID()

        const newTitle = formatExamTitle({
          subjectLabel: SUBJECT_LABEL[examRow.subject as ExamSubject] ?? examRow.subject,
          grade: examRow.grade,
          examType: examRow.examType ?? '',
          examDate: examRow.examDate ?? null,
          topics: (examRow.topics as string[]) ?? [],
        })

        yield* tryDb(() =>
          db.insert(exams).values({
            id: newExamId,
            userId: examRow.userId,
            title: newTitle,
            subject: examRow.subject,
            grade: examRow.grade,
            difficulty: examRow.difficulty,
            topics: (examRow.topics as string[]) ?? [],
            reviewMode: examRow.reviewMode,
            status: 'draft',
            schoolName: examRow.schoolName,
            academicYear: examRow.academicYear,
            examType: examRow.examType,
            examDate: examRow.examDate,
            durationMinutes: examRow.durationMinutes,
            instructions: examRow.instructions,
            classContext: examRow.classContext,
            discussionMd: examRow.discussionMd,
            createdAt: now,
            updatedAt: now,
          }),
        )

        if (sourceQuestions.length > 0) {
          yield* tryDb(() =>
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
                createdAt: now,
              })),
            ),
          )
        }

        const newExamWithQuestions = yield* tryDb(() => fetchExamWithQuestions(newExamId))
        if (!newExamWithQuestions) {
          return yield* Effect.fail(
            new ApiDatabaseError({
              error: 'Failed to retrieve duplicated exam',
              code: 'DATABASE_ERROR',
            }),
          )
        }
        return newExamWithQuestions
      }),
    )
    .handle('shareExam', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path

        const examRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        const slug = examRow.publicShareSlug ?? crypto.randomUUID()
        const publishedAt = examRow.publishedAt ?? new Date()

        yield* tryDb(() =>
          db
            .update(exams)
            .set({
              isPublic: true,
              publicShareSlug: slug,
              publishedAt,
              updatedAt: new Date(),
            })
            .where(and(eq(exams.id, id), eq(exams.userId, userId))),
        )

        const result: ExamShareResponse = {
          slug,
          publicUrlPath: `/share/${slug}`,
          publishedAt: publishedAt.toISOString(),
        }
        return result
      }),
    )
    .handle('validateCurriculum', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path
        const aiService = yield* AiClient

        const result = yield* Effect.tryPromise({
          try: () => validateExamCurriculum(id, userId, aiService),
          catch: () => new ApiDatabaseError({ error: 'Database error', code: 'DATABASE_ERROR' }),
        })
        if (!result) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }
        return result
      }),
    )
    .handle('finalizeExam', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path

        const [examRows, questionRows] = yield* tryDb(() =>
          Promise.all([
            db.select().from(exams).where(and(eq(exams.id, id), eq(exams.userId, userId))).limit(1),
            db.select().from(questions).where(eq(questions.examId, id)),
          ]),
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        if (questionRows.length === 0) {
          return yield* Effect.fail(
            new ApiFinalizeNotAllowed({
              error: 'Exam has no questions to finalize',
              code: 'FINALIZE_NOT_ALLOWED',
              details: { pendingCount: 0, rejectedCount: 0 },
            }),
          )
        }

        const pendingCount = questionRows.filter((q) => q.status === 'pending').length
        const rejectedCount = questionRows.filter((q) => q.status === 'rejected').length

        if (pendingCount > 0 || rejectedCount > 0) {
          if (examRows[0]?.reviewMode === 'fast') {
            yield* tryDb(() =>
              db.update(questions).set({ status: 'accepted' }).where(eq(questions.examId, id)),
            )
          } else {
            return yield* Effect.fail(
              new ApiFinalizeNotAllowed({
                error: 'Not all questions are accepted',
                code: 'FINALIZE_NOT_ALLOWED',
                details: { pendingCount, rejectedCount },
              }),
            )
          }
        }

        yield* tryDb(() =>
          db
            .update(exams)
            .set({ status: 'final', updatedAt: new Date() })
            .where(and(eq(exams.id, id), eq(exams.userId, userId))),
        )

        const result = yield* tryDb(() => fetchExamWithQuestions(id))
        if (!result) {
          return yield* Effect.fail(
            new ApiDatabaseError({
              error: 'Failed to retrieve finalized exam',
              code: 'DATABASE_ERROR',
            }),
          )
        }
        return result
      }),
    )
    .handleRaw('discussionExam', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path
        const aiService = yield* AiClient

        const examRows = yield* tryDb(() =>
          db
            .select()
            .from(exams)
            .where(and(eq(exams.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        if (!examRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Exam not found', code: 'NOT_FOUND' }),
          )
        }

        const exam = examRows[0]

        if (exam.status !== 'final') {
          return yield* Effect.fail(
            new ApiExamNotFinal({
              error: 'Exam must be finalized before generating discussion',
              code: 'EXAM_NOT_FINAL',
            }),
          )
        }

        if (exam.discussionMd !== null) {
          return yield* Effect.fail(
            new ApiDiscussionExists({
              error: 'Discussion already exists for this exam',
              code: 'DISCUSSION_ALREADY_EXISTS',
            }),
          )
        }

        const questionRows = yield* tryDb(() =>
          db.select().from(questions).where(eq(questions.examId, id)).orderBy(questions.number),
        )

        const { system, user } = buildPembahasanPrompt({
          exam: {
            subject: SUBJECT_LABEL[exam.subject as ExamSubject] ?? exam.subject,
            grade: exam.grade,
            examType: exam.examType ?? 'formatif',
          },
          questions: questionRows.map((q) => rowToQuestion(q)),
        })

        return new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              const encoder = new TextEncoder()
              const writeSse = (event: string, data: string) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
              }

              const heartbeat = setInterval(() => {
                writeSse('ping', '')
              }, 25_000)

              try {
                let discussionMd = ''
                for await (const chunk of aiService.streamDiscussion({ system, user })) {
                  discussionMd += chunk
                }

                clearInterval(heartbeat)

                await db
                  .update(exams)
                  .set({ discussionMd, updatedAt: new Date() })
                  .where(and(eq(exams.id, id), eq(exams.userId, userId)))

                const updated = await fetchExamWithQuestions(id)
                writeSse('done', JSON.stringify(updated ?? { error: 'Failed to retrieve updated exam' }))
              } catch (err) {
                clearInterval(heartbeat)
                const fromCause = (e: unknown): string => {
                  if (e && typeof e === 'object' && 'cause' in e) {
                    const c = (e as { cause: unknown }).cause
                    if (typeof c === 'string' && c.length > 0) return c
                    if (c && typeof c === 'object' && 'cause' in c) {
                      const inner = (c as { cause: unknown }).cause
                      if (typeof inner === 'string' && inner.length > 0) return inner
                    }
                  }
                  return ''
                }
                const baseMessage = err instanceof Error && err.message ? err.message : fromCause(err)
                const message = baseMessage || 'AI generation failed'
                writeSse('error', JSON.stringify({ message }))
              } finally {
                controller.close()
              }
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          },
        )
      }),
    ),
)
