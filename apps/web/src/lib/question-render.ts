import { Match } from 'effect'
import type { Question } from '@teacher-exam/shared'

export const matchQuestion = <T>(q: Question, h: {
  mcq_single: (q: Extract<Question, { _tag: 'mcq_single' }>) => T
  mcq_multi:  (q: Extract<Question, { _tag: 'mcq_multi' }>) => T
  true_false: (q: Extract<Question, { _tag: 'true_false' }>) => T
}): T => Match.value(q).pipe(
  Match.tag('mcq_single', (x) => h.mcq_single(x)),
  Match.tag('mcq_multi',  (x) => h.mcq_multi(x)),
  Match.tag('true_false', (x) => h.true_false(x)),
  Match.exhaustive,
) as T

export const questionCorrectLabel = (q: Question): string =>
  matchQuestion(q, {
    mcq_single: (x) => x.correct.toUpperCase(),
    mcq_multi:  (x) => x.correct.map((l) => l.toUpperCase()).join(', '),
    true_false: (x) => x.statements.map((s) => (s.answer ? 'B' : 'S')).join(', '),
  })
