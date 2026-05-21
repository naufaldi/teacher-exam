import { Effect, Either, Schema } from 'effect'
import { GeneratedQuestionSchema, type GeneratedQuestion } from '@teacher-exam/shared'
import { AiGenerationError } from '../errors'
import { normalizeGeneratedQuestionItem } from './normalize-ai-output'
import { parseAiJsonArray } from './repair-ai-json'

export type ParsedItemFailure = {
  index: number
  error: string
}

export type ParseGeneratedQuestionsResult = {
  valid: ReadonlyArray<GeneratedQuestion>
  failed: ReadonlyArray<ParsedItemFailure>
  missingNumbers: ReadonlyArray<number>
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('```')) {
    const inner = trimmed.replace(/^```(?:json|markdown)?\n?/i, '').replace(/```\s*$/, '')
    return inner.trim()
  }
  return trimmed
}

function formatDecodeError(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error)
}

/**
 * Decode each array element independently so one bad soal does not reject the batch.
 */
export function parseGeneratedQuestions(
  raw: string,
  expectedCount: number,
): Either.Either<ParseGeneratedQuestionsResult, AiGenerationError> {
  let parsed: unknown[]
  try {
    parsed = parseAiJsonArray(stripCodeFence(raw))
  } catch (cause) {
    return Either.left(
      new AiGenerationError({
        cause: `AI returned non-JSON output: ${(cause as Error).message}`,
      }),
    )
  }

  const failed: ParsedItemFailure[] = []
  const byNumber = new Map<number, GeneratedQuestion>()

  parsed.forEach((item, index) => {
    const normalized = normalizeGeneratedQuestionItem(item)
    const decoded = Schema.decodeUnknownEither(GeneratedQuestionSchema)(normalized)
    if (Either.isLeft(decoded)) {
      failed.push({ index, error: formatDecodeError(decoded.left) })
      return
    }
    const question = decoded.right
    if (question.number < 1 || question.number > expectedCount) {
      failed.push({
        index,
        error: `number ${question.number} out of range 1..${expectedCount}`,
      })
      return
    }
    if (!byNumber.has(question.number)) {
      byNumber.set(question.number, question)
    }
  })

  const valid = Array.from(byNumber.entries())
    .sort(([a], [b]) => a - b)
    .map(([, q]) => q)

  const missingNumbers: number[] = []
  for (let n = 1; n <= expectedCount; n++) {
    if (!byNumber.has(n)) missingNumbers.push(n)
  }

  if (valid.length === 0) {
    return Either.left(
      new AiGenerationError({
        cause: `AI output had no valid questions (${failed.length} failed item(s))`,
      }),
    )
  }

  return Either.right({ valid, failed, missingNumbers })
}

/**
 * Strict parse — all items valid and count must match (single-question regen path).
 */
export function parseGeneratedQuestionsStrict(
  raw: string,
  expectedCount: number,
): Effect.Effect<ReadonlyArray<GeneratedQuestion>, AiGenerationError> {
  return Effect.gen(function* () {
    const parsed = parseGeneratedQuestions(raw, expectedCount)
    if (Either.isLeft(parsed)) {
      return yield* Effect.fail(parsed.left)
    }
    const salvage = parsed.right
    if (salvage.missingNumbers.length > 0 || salvage.failed.length > 0) {
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `AI output failed schema validation: ${salvage.failed.length} invalid, ${salvage.missingNumbers.length} missing (expected ${expectedCount})`,
        }),
      )
    }
    if (salvage.valid.length !== expectedCount) {
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `Expected ${expectedCount} questions, got ${salvage.valid.length}`,
        }),
      )
    }
    return salvage.valid
  })
}
