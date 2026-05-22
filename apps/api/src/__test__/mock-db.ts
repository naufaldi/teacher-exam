import { vi } from 'vitest'

export function createMockDbModule() {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
