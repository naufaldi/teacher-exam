import { vi } from 'vitest'
import { Effect, Effectable } from 'effect'

const CHAIN_METHODS = [
  'from',
  'where',
  'orderBy',
  'limit',
  'offset',
  'set',
  'values',
  'innerJoin',
  'returning',
  'onConflictDoNothing',
] as const

export function makeQueryEffect<T>(result: T) {
  class Query extends Effectable.Class<T, never, never> {
    commit() {
      return Effect.succeed(result)
    }
  }
  const query = new Query() as Query &
    Record<(typeof CHAIN_METHODS)[number], ReturnType<typeof vi.fn>>
  for (const m of CHAIN_METHODS) {
    query[m] = vi.fn(() => makeQueryEffect(result))
  }
  const promise = Promise.resolve(result)
  return Object.assign(query, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  })
}

export function createMockDbModule() {
  const db = {
    select: vi.fn(() => makeQueryEffect([])),
    insert: vi.fn(() => makeQueryEffect(undefined)),
    update: vi.fn(() => makeQueryEffect(undefined)),
    delete: vi.fn(() => makeQueryEffect(undefined)),
    transaction: vi.fn(),
  }
  return {
    db,
    exams: {
      id: 'exams.id',
      userId: 'exams.userId',
      createdAt: 'exams.createdAt',
      isPublic: 'exams.isPublic',
      publicShareSlug: 'exams.publicShareSlug',
      status: 'exams.status',
      discussionMd: 'exams.discussionMd',
    },
    questions: {
      examId: 'questions.examId',
      number: 'questions.number',
      id: 'questions.id',
      text: 'questions.text',
      status: 'questions.status',
    },
    bankQuestions: {
      id: 'bank_questions.id',
      userId: 'bank_questions.userId',
      questionId: 'bank_questions.questionId',
      subject: 'bank_questions.subject',
      grade: 'bank_questions.grade',
      topics: 'bank_questions.topics',
      difficulty: 'bank_questions.difficulty',
      type: 'bank_questions.type',
      payload: 'bank_questions.payload',
      isPublic: 'bank_questions.isPublic',
      usageCount: 'bank_questions.usageCount',
      createdAt: 'bank_questions.createdAt',
    },
    user: {
      id: 'user.id',
      email: 'user.email',
      name: 'user.name',
      username: 'user.username',
      image: 'user.image',
      school: 'user.school',
      gradesTaught: 'user.gradesTaught',
      subjectsTaught: 'user.subjectsTaught',
      profileCompleted: 'user.profileCompleted',
      locale: 'user.locale',
      timezone: 'user.timezone',
      updatedAt: 'user.updatedAt',
    },
    session: {},
    account: {},
    verification: {},
  }
}
