import { HttpApiBuilder } from '@effect/platform'
import { Effect, Either, Schema, Match } from 'effect'
import { eq, and, ne } from 'drizzle-orm'
import { exams, questions } from '@teacher-exam/db'
import { UpdateQuestionInputSchema, RegenerateQuestionInputSchema, SUBJECT_LABEL, type ExamSubject } from '@teacher-exam/shared'
import type { McqSingleQuestion, McqMultiQuestion, TrueFalseQuestion } from '@teacher-exam/shared'
import { rowToQuestion, questionToRow } from '../../lib/question-mapper'
import { getCurriculumText } from '../../lib/curriculum'
import { validateGeneratedQuestionLatex } from '../../lib/latex-validator.js'
import { normalizeMatematikaLatexField } from '../../lib/normalize-matematika-latex.js'
import { buildRegeneratePrompt } from '../../lib/prompt'
import { TeacherExamApi } from '../definition'
import {
  ApiAiError,
  ApiDatabaseError,
  ApiNotFound,
  ApiValidationError422,
  ApiValidationError422NoDetails,
} from '../errors/http'
import { CurrentUser } from '../middleware/auth'
import { runDb } from '../lib/db-effect'
import { DbClient } from '../services/db'
import { AiClient } from '../services/ai'

export const QuestionsLive = HttpApiBuilder.group(TeacherExamApi, 'questions', (handlers) =>
  handlers
    .handle('patchQuestion', ({ path, payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path
        const db = yield* DbClient

        const decode = Schema.decodeUnknownEither(UpdateQuestionInputSchema)
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

        const hasChanges =
          input.text !== undefined ||
          input.status !== undefined ||
          ('options' in input && input.options !== undefined) ||
          ('correct' in input && input.correct !== undefined) ||
          ('statements' in input && input.statements !== undefined)

        if (!hasChanges) {
          return yield* Effect.fail(
            new ApiValidationError422NoDetails({
              error: 'No fields to update',
              code: 'VALIDATION_ERROR',
            }),
          )
        }

        const ownerRows = yield* runDb(
          db
            .select({ questionId: questions.id, examUserId: exams.userId })
            .from(questions)
            .innerJoin(exams, eq(questions.examId, exams.id))
            .where(and(eq(questions.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        if (!ownerRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Question not found', code: 'NOT_FOUND' }),
          )
        }

        const existingRows = yield* runDb(
          db.select().from(questions).where(eq(questions.id, id)).limit(1),
        )

        if (!existingRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Question not found', code: 'NOT_FOUND' }),
          )
        }

        const existingQuestion = rowToQuestion(existingRows[0])
        const inputTag = '_tag' in input ? input._tag : undefined
        const effectiveTag = inputTag ?? existingQuestion._tag

        const mergedQuestion = Match.value(effectiveTag).pipe(
          Match.when('mcq_single', () => {
            const base =
              existingQuestion._tag === 'mcq_single'
                ? existingQuestion
                : { options: { a: '', b: '', c: '', d: '' }, correct: 'a' as const }
            const inputOptions = 'options' in input ? input.options : undefined
            const inputCorrect = 'correct' in input ? input.correct : undefined
            const merged: McqSingleQuestion = {
              ...existingQuestion,
              _tag: 'mcq_single',
              options: inputOptions ?? (base as McqSingleQuestion).options,
              correct:
                (inputCorrect as McqSingleQuestion['correct']) ??
                (base as McqSingleQuestion).correct,
              text: input.text ?? existingQuestion.text,
              status: input.status ?? existingQuestion.status,
            }
            return merged
          }),
          Match.when('mcq_multi', () => {
            const base =
              existingQuestion._tag === 'mcq_multi'
                ? existingQuestion
                : { options: { a: '', b: '', c: '', d: '' }, correct: [] as McqMultiQuestion['correct'] }
            const inputOptions = 'options' in input ? input.options : undefined
            const inputCorrect = 'correct' in input ? input.correct : undefined
            const merged: McqMultiQuestion = {
              ...existingQuestion,
              _tag: 'mcq_multi',
              options: inputOptions ?? (base as McqMultiQuestion).options,
              correct:
                (inputCorrect as McqMultiQuestion['correct']) ??
                (base as McqMultiQuestion).correct,
              text: input.text ?? existingQuestion.text,
              status: input.status ?? existingQuestion.status,
            }
            return merged
          }),
          Match.when('true_false', () => {
            const base =
              existingQuestion._tag === 'true_false'
                ? existingQuestion
                : { statements: [] as TrueFalseQuestion['statements'] }
            const inputStatements = 'statements' in input ? input.statements : undefined
            const merged: TrueFalseQuestion = {
              ...existingQuestion,
              _tag: 'true_false',
              statements:
                (inputStatements as TrueFalseQuestion['statements']) ??
                (base as TrueFalseQuestion).statements,
              text: input.text ?? existingQuestion.text,
              status: input.status ?? existingQuestion.status,
            }
            return merged
          }),
          Match.orElse(() => existingQuestion),
        )

        const typeCols = questionToRow(mergedQuestion)
        const updateData: Record<string, unknown> = {
          type: typeCols.type,
          optionA: typeCols.optionA,
          optionB: typeCols.optionB,
          optionC: typeCols.optionC,
          optionD: typeCols.optionD,
          correctAnswer: typeCols.correctAnswer,
          payload: typeCols.payload,
        }
        if (input.text !== undefined) updateData['text'] = input.text
        if (input.status !== undefined) updateData['status'] = input.status

        const updatedRows = yield* runDb(
          db.update(questions).set(updateData).where(eq(questions.id, id)).returning(),
        )
        const updated = updatedRows[0]
        if (!updated) {
          return yield* Effect.fail(
            new ApiDatabaseError({ error: 'Question disappeared', code: 'DATABASE_ERROR' }),
          )
        }
        return rowToQuestion(updated)
      }),
    )
    .handle('regenerateQuestion', ({ path, payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const { id } = path
        const aiService = yield* AiClient
        const db = yield* DbClient

        const decode = Schema.decodeUnknownEither(RegenerateQuestionInputSchema)
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
        const hint = input.hint

        const ownerRows = yield* runDb(
          db
            .select({ question: questions, exam: exams })
            .from(questions)
            .innerJoin(exams, eq(questions.examId, exams.id))
            .where(and(eq(questions.id, id), eq(exams.userId, userId)))
            .limit(1),
        )

        if (!ownerRows[0]) {
          return yield* Effect.fail(
            new ApiNotFound({ error: 'Question not found', code: 'NOT_FOUND' }),
          )
        }

        const { question, exam } = ownerRows[0]

        const siblingRows = yield* runDb(
          db
            .select({ text: questions.text })
            .from(questions)
            .where(and(eq(questions.examId, question.examId), ne(questions.id, id))),
        )

        const siblingTexts = siblingRows.map((r) => r.text)
        const isMatematika = exam.subject === 'matematika'
        const curriculumText = yield* Effect.tryPromise({
          try: () => getCurriculumText(exam.subject, exam.grade),
          catch: () => new ApiDatabaseError({ error: 'Curriculum lookup failed', code: 'DATABASE_ERROR' }),
        })
        const { system, user } = buildRegeneratePrompt({
          grade: exam.grade,
          subjectLabel: SUBJECT_LABEL[exam.subject as ExamSubject] ?? exam.subject,
          examSubject: exam.subject,
          topic: question.topic ?? exam.topics[0] ?? exam.subject,
          difficulty: question.difficulty ?? exam.difficulty,
          siblingTexts,
          hint,
          curriculumText,
        })

        const aiResult = yield* Effect.either(aiService.generate({ system, user, expectedCount: 1 }))
        if (Either.isLeft(aiResult)) {
          return yield* Effect.fail(
            new ApiAiError({ error: 'AI generation failed', code: 'AI_ERROR' }),
          )
        }
        const result = aiResult.right

        if (result.length === 0 || !result[0]) {
          return yield* Effect.fail(
            new ApiAiError({ error: 'AI generation failed', code: 'AI_ERROR' }),
          )
        }

        let generated = result[0]
        if (generated._tag !== 'mcq_single') {
          return yield* Effect.fail(
            new ApiAiError({ error: 'AI generation failed', code: 'AI_ERROR' }),
          )
        }

        if (isMatematika) {
          generated = {
            ...generated,
            text: normalizeMatematikaLatexField(generated.text),
            option_a: normalizeMatematikaLatexField(generated.option_a),
            option_b: normalizeMatematikaLatexField(generated.option_b),
            option_c: normalizeMatematikaLatexField(generated.option_c),
            option_d: normalizeMatematikaLatexField(generated.option_d),
          }
        }

        const latexResult = isMatematika
          ? validateGeneratedQuestionLatex(generated)
          : { _tag: 'valid' as const }
        const validationReason =
          latexResult._tag === 'invalid' ? `LaTeX validation failed: ${latexResult.reason}` : null

        const updatedRows = yield* runDb(
          db
            .update(questions)
            .set({
              type: 'mcq_single',
              text: generated.text,
              optionA: generated.option_a,
              optionB: generated.option_b,
              optionC: generated.option_c,
              optionD: generated.option_d,
              correctAnswer: generated.correct_answer,
              payload: null,
              status: 'pending' as const,
              topic: generated.topic,
              difficulty: generated.difficulty,
              validationStatus: validationReason !== null ? ('needs_review' as const) : null,
              validationReason,
            })
            .where(eq(questions.id, id))
            .returning(),
        )

        const updatedRow = updatedRows[0]
        if (!updatedRow) {
          return yield* Effect.fail(
            new ApiDatabaseError({ error: 'Question disappeared', code: 'DATABASE_ERROR' }),
          )
        }
        return rowToQuestion(updatedRow)
      }),
    ),
)
