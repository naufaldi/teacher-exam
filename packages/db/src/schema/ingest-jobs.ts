import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { pdfUploads } from "./pdf-uploads"

export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "completed", "failed"])

export const ingestJobs = pgTable("ingest_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  pdfUploadId: uuid("pdf_upload_id").notNull()
    .references(() => pdfUploads.id, { onDelete: "cascade" }),
  status: jobStatusEnum("status").default("queued").notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})
