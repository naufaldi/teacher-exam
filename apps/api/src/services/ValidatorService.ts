import { Effect, Either } from 'effect'
import type { Question, ValidationStatus } from '@teacher-exam/shared'
import { buildValidatorPrompt } from '../lib/validator-prompt'
import { mergeValidationStatus, validationFailureFallback } from '../lib/validation-status'
import type { AiService } from './AiService'
import { AiGenerationError } from '../errors'

const CHUNK_SIZE = 5
const MAX_CONCURRENCY = 3

export interface ValidateBatchParams {
  aiService: AiService
  exam: {
    subject: string
    grade: number
    examType: string
  }
  curriculumText: string
  questions: ReadonlyArray<Question>
}

export interface QuestionValidationUpdate {
  id: string
  validationStatus: ValidationStatus
  validationReason: string
}

function chunkArray<T>(items: ReadonlyArray<T>, size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size) as T[])
  }
  return chunks
}

function validateChunk(
  aiService: AiService,
  exam: ValidateBatchParams['exam'],
  curriculumText: string,
  chunk: ReadonlyArray<Question>,
): Effect.Effect<ReadonlyArray<{ number: number; status: ValidationStatus; reason: string }>> {
  return Effect.gen(function* () {
    const { system, user } = buildValidatorPrompt({
      exam,
      curriculumText,
      questions: chunk,
    })

    const result = yield* Effect.either(
      aiService.validateCurriculum({
        system,
        user,
        expectedCount: chunk.length,
      }),
    )

    if (Either.isLeft(result)) {
      const cause =
        result.left instanceof AiGenerationError
          ? String(result.left.cause)
          : String(result.left)
      const fallback = validationFailureFallback(cause)
      return chunk.map((q) => ({
        number: q.number,
        status: fallback.validationStatus,
        reason: fallback.validationReason,
      }))
    }

    return result.right.map((item) => ({
      number: item.number,
      status: item.status,
      reason: item.reason,
    }))
  })
}

export function validateQuestionBatch(
  params: ValidateBatchParams,
): Effect.Effect<ReadonlyArray<QuestionValidationUpdate>> {
  return Effect.gen(function* () {
    const { aiService, exam, curriculumText, questions } = params
    if (questions.length === 0) return []

    const chunks = chunkArray(questions, CHUNK_SIZE)
    const chunkResults = yield* Effect.forEach(
      chunks,
      (chunk) => validateChunk(aiService, exam, curriculumText, chunk),
      { concurrency: MAX_CONCURRENCY },
    )

    const byNumber = new Map<number, { status: ValidationStatus; reason: string }>()
    for (const chunk of chunkResults) {
      for (const item of chunk) {
        byNumber.set(item.number, { status: item.status, reason: item.reason })
      }
    }

    return questions.map((question) => {
      const fallback = validationFailureFallback('missing from AI output')
      const curriculum = byNumber.get(question.number) ?? {
        status: fallback.validationStatus,
        reason: fallback.validationReason,
      }
      const merged = mergeValidationStatus(
        { status: question.validationStatus, reason: question.validationReason },
        curriculum,
      )
      return {
        id: question.id,
        validationStatus: merged.validationStatus,
        validationReason: merged.validationReason,
      }
    })
  })
}

export function validateSingleQuestion(
  params: Omit<ValidateBatchParams, 'questions'> & { question: Question },
): Effect.Effect<QuestionValidationUpdate> {
  return Effect.gen(function* () {
    const updates = yield* validateQuestionBatch({
      ...params,
      questions: [params.question],
    })
    const update = updates[0]
    if (!update) {
      const fallback = validationFailureFallback('empty validation result')
      return {
        id: params.question.id,
        validationStatus: fallback.validationStatus,
        validationReason: fallback.validationReason,
      }
    }
    return update
  })
}
