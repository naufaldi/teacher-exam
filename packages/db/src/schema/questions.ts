import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { exams } from './exams'
import { answerEnum, questionStatusEnum } from './enums'

export const questions = pgTable('questions', {
  id:               uuid('id').primaryKey().defaultRandom(),
  examId:           uuid('exam_id').notNull()
                      .references(() => exams.id, { onDelete: 'cascade' }),
  number:           integer('number').notNull(),
  text:             text('text').notNull(),
  optionA:          text('option_a'),
  optionB:          text('option_b'),
  optionC:          text('option_c'),
  optionD:          text('option_d'),
  correctAnswer:    answerEnum('correct_answer'),
  type:             text('type').notNull().default('mcq_single'),
  payload:          jsonb('payload'),
  topic:            text('topic'),
  difficulty:       text('difficulty'),
  status:           questionStatusEnum('status').default('pending').notNull(),
  validationStatus: text('validation_status'),
  validationReason: text('validation_reason'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
