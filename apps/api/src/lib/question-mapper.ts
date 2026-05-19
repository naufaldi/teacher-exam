import { Either, Match, Schema } from 'effect'
import {
  FigureSpecSchema,
  type FigureSpec,
  type Question,
  type McqSingleQuestion,
  type McqMultiQuestion,
  type TrueFalseQuestion,
} from '@teacher-exam/shared'

// Type representing a DB row from the questions table
type QuestionRow = {
  id: string
  examId: string
  number: number
  text: string
  optionA: string | null
  optionB: string | null
  optionC: string | null
  optionD: string | null
  correctAnswer: string | null
  type: string
  payload: unknown
  topic: string | null
  difficulty: string | null
  status: string
  validationStatus: string | null
  validationReason: string | null
  createdAt: Date | string
}

type QuestionRowPayload = Record<string, unknown>

function payloadObject(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return {}
  return payload as QuestionRowPayload
}

function readGenerationFailed(payload: unknown): boolean | undefined {
  const flag = payloadObject(payload)['generationFailed']
  return flag === true ? true : undefined
}

function decodePayloadFigure(payload: unknown): FigureSpec | null {
  const figure = payloadObject(payload)['figure']
  if (figure === undefined || figure === null) return null
  const decoded = Schema.decodeUnknownEither(FigureSpecSchema)(figure)
  return Either.isRight(decoded) ? decoded.right : null
}

function commonFields(row: QuestionRow): Omit<McqSingleQuestion, '_tag' | 'options' | 'correct'> {
  const generationFailed = readGenerationFailed(row.payload)
  return {
    id: row.id,
    examId: row.examId,
    number: row.number,
    text: row.text,
    topic: row.topic,
    difficulty: row.difficulty,
    status: row.status as McqSingleQuestion['status'],
    validationStatus: row.validationStatus as McqSingleQuestion['validationStatus'],
    validationReason: row.validationReason,
    ...(generationFailed === true ? { generationFailed: true } : {}),
    figure: decodePayloadFigure(row.payload),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
  }
}

type QuestionRowWrite = {
  type: string
  optionA: string | null
  optionB: string | null
  optionC: string | null
  optionD: string | null
  correctAnswer: 'a' | 'b' | 'c' | 'd' | null
  payload: unknown
}

export function rowToQuestion(row: QuestionRow): Question {
  return Match.value(row.type).pipe(
    Match.when('mcq_single', () => {
      const q: McqSingleQuestion = {
        ...commonFields(row),
        _tag: 'mcq_single',
        options: {
          a: row.optionA ?? '',
          b: row.optionB ?? '',
          c: row.optionC ?? '',
          d: row.optionD ?? '',
        },
        correct: (row.correctAnswer ?? 'a') as McqSingleQuestion['correct'],
      }
      return q
    }),
    Match.when('mcq_multi', () => {
      const p = payloadObject(row.payload) as { options: { a: string; b: string; c: string; d: string }; correct: string[] }
      const q: McqMultiQuestion = {
        ...commonFields(row),
        _tag: 'mcq_multi',
        options: p.options,
        correct: p.correct as McqMultiQuestion['correct'],
      }
      return q
    }),
    Match.when('true_false', () => {
      const p = payloadObject(row.payload) as { statements: Array<{ text: string; answer: boolean }> }
      const q: TrueFalseQuestion = {
        ...commonFields(row),
        _tag: 'true_false',
        statements: p.statements as TrueFalseQuestion['statements'],
      }
      return q
    }),
    Match.orElse(() => {
      // Unknown type — fall back to mcq_single shape to avoid runtime crash
      const q: McqSingleQuestion = {
        ...commonFields(row),
        _tag: 'mcq_single',
        options: { a: '', b: '', c: '', d: '' } as McqSingleQuestion['options'],
        correct: 'a',
      }
      return q
    }),
  )
}

function payloadWithFigure(
  payload: QuestionRowPayload | null,
  figure: FigureSpec | null | undefined,
  generationFailed?: boolean,
): QuestionRowPayload | null {
  const base = { ...(payload ?? {}) }
  if (generationFailed === true) {
    base['generationFailed'] = true
  }
  if (!figure && Object.keys(base).length === 0) return payload
  if (figure) base['figure'] = figure
  return base
}

export function questionToRow(q: Question): QuestionRowWrite {
  return Match.value(q).pipe(
    Match.tag('mcq_single', (x) => ({
      type: 'mcq_single' as const,
      optionA: x.options.a,
      optionB: x.options.b,
      optionC: x.options.c,
      optionD: x.options.d,
      correctAnswer: x.correct,
      payload: payloadWithFigure(null, x.figure, x.generationFailed),
    })),
    Match.tag('mcq_multi', (x) => ({
      type: 'mcq_multi' as const,
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
      payload: payloadWithFigure({ options: x.options, correct: x.correct }, x.figure, x.generationFailed),
    })),
    Match.tag('true_false', (x) => ({
      type: 'true_false' as const,
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
      payload: payloadWithFigure({ statements: x.statements }, x.figure, x.generationFailed),
    })),
    Match.exhaustive,
  )
}
