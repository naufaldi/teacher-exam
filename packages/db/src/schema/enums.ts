import { pgEnum } from 'drizzle-orm/pg-core'

export const examSubjectEnum = pgEnum('exam_subject', [
  'bahasa_indonesia',
  'pendidikan_pancasila',
])
export const examDifficultyEnum = pgEnum('exam_difficulty', [
  'mudah', 'sedang', 'sulit', 'campuran',
])
export const reviewModeEnum = pgEnum('review_mode', ['fast', 'slow'])
export const examStatusEnum = pgEnum('exam_status', ['draft', 'final'])
export const questionStatusEnum = pgEnum('question_status', [
  'pending', 'accepted', 'rejected',
])
export const answerEnum = pgEnum('answer', ['a', 'b', 'c', 'd'])
