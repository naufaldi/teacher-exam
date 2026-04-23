import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { user } from './users'
import { exams } from './exams'

export const pdfUploads = pgTable('pdf_uploads', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        text('user_id').notNull()
                   .references(() => user.id, { onDelete: 'cascade' }),
  examId:        uuid('exam_id')
                   .references(() => exams.id, { onDelete: 'set null' }),
  fileName:      text('file_name').notNull(),
  fileSize:      integer('file_size').notNull(),
  extractedText: text('extracted_text'),
  uploadedAt:    timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt:     timestamp('expires_at', { withTimezone: true }).notNull(),
})
