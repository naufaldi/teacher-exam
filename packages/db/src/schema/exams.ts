import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import {
  examSubjectEnum,
  examDifficultyEnum,
  reviewModeEnum,
  examStatusEnum,
} from './enums'

export const exams = pgTable('exams', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull()
                     .references(() => users.id, { onDelete: 'cascade' }),
  title:           text('title').notNull(),
  subject:         examSubjectEnum('subject').notNull(),
  grade:           integer('grade').notNull(),
  difficulty:      examDifficultyEnum('difficulty').notNull(),
  topic:           text('topic').notNull(),
  reviewMode:      reviewModeEnum('review_mode').default('fast').notNull(),
  status:          examStatusEnum('status').default('draft').notNull(),
  schoolName:      text('school_name'),
  academicYear:    text('academic_year'),
  examType:        text('exam_type').default('TKA').notNull(),
  examDate:        text('exam_date'),
  durationMinutes: integer('duration_minutes'),
  instructions:    text('instructions'),
  classContext:    text('class_context'),
  discussionMd:    text('discussion_md'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
