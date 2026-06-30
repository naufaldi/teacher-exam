import { jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const chunkSourceEnum = pgEnum("chunk_source", ["corpus", "teacher_pdf"])

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  docId: text("doc_id").notNull(),
  source: chunkSourceEnum("source").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  embedding: real("embedding").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})
