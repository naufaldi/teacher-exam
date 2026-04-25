import { Match } from 'effect'
import type { Question, McqSingleQuestion, McqMultiQuestion, TrueFalseQuestion } from '@teacher-exam/shared'

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

const commonFields = (row: QuestionRow) => ({
  id: row.id,
  examId: row.examId,
  number: row.number,
  text: row.text,
  topic: row.topic,
  difficulty: row.difficulty,
  status: row.status as McqSingleQuestion['status'],
  validationStatus: row.validationStatus as McqSingleQuestion['validationStatus'],
  validationReason: row.validationReason,
  createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
})

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
      const p = row.payload as { options: { a: string; b: string; c: string; d: string }; correct: string[] }
      const q: McqMultiQuestion = {
        ...commonFields(row),
        _tag: 'mcq_multi',
        options: p.options,
        correct: p.correct as McqMultiQuestion['correct'],
      }
      return q
    }),
    Match.when('true_false', () => {
      const p = row.payload as { statements: Array<{ text: string; answer: boolean }> }
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

export function questionToRow(q: Question): {
  type: string
  optionA: string | null
  optionB: string | null
  optionC: string | null
  optionD: string | null
  correctAnswer: 'a' | 'b' | 'c' | 'd' | null
  payload: unknown
} {
  return Match.value(q).pipe(
    Match.tag('mcq_single', (x) => ({
      type: 'mcq_single' as const,
      optionA: x.options.a,
      optionB: x.options.b,
      optionC: x.options.c,
      optionD: x.options.d,
      correctAnswer: x.correct,
      payload: null,
    })),
    Match.tag('mcq_multi', (x) => ({
      type: 'mcq_multi' as const,
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
      payload: { options: x.options, correct: x.correct },
    })),
    Match.tag('true_false', (x) => ({
      type: 'true_false' as const,
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
      payload: { statements: x.statements },
    })),
    Match.exhaustive,
  )
}
