import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { user } from './users'
import { questions } from './questions'
import { examSubjectEnum, examDifficultyEnum } from './enums'

export const bankQuestions = pgTable(
  'bank_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    subject: examSubjectEnum('subject').notNull(),
    grade: integer('grade').notNull(),
    topics: jsonb('topics').$type<string[]>().notNull().default([]),
    difficulty: examDifficultyEnum('difficulty').notNull(),
    type: text('type').notNull().default('mcq_single'),
    payload: jsonb('payload').notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('bank_questions_user_id_idx').on(t.userId),
    index('bank_questions_public_browse_idx').on(t.isPublic, t.subject, t.grade),
    unique('bank_questions_user_id_question_id_unique').on(t.userId, t.questionId),
  ],
)
