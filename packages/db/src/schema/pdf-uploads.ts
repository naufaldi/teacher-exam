import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { pdfUploadStatusEnum } from "./enums"
import { user } from "./users"

export const pdfUploads = pgTable("pdf_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  storageKey: text("storage_key").notNull(),
  status: pdfUploadStatusEnum("status").default("uploaded").notNull(),
  errorMessage: text("error_message"),
  pageCount: integer("page_count"),
  extractedText: text("extracted_text"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
})
