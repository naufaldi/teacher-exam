import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { exams } from './exams'
import { answerEnum, questionStatusEnum } from './enums'

export const questions = pgTable('questions', {
  id:               uuid('id').primaryKey().defaultRandom(),
  examId:           uuid('exam_id').notNull()
                      .references(() => exams.id, { onDelete: 'cascade' }),
  number:           integer('number').notNull(),
  text:             text('text').notNull(),
  optionA:          text('option_a').notNull(),
  optionB:          text('option_b').notNull(),
  optionC:          text('option_c').notNull(),
  optionD:          text('option_d').notNull(),
  correctAnswer:    answerEnum('correct_answer').notNull(),
  topic:            text('topic'),
  difficulty:       text('difficulty'),
  status:           questionStatusEnum('status').default('pending').notNull(),
  validationStatus: text('validation_status'),
  validationReason: text('validation_reason'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
