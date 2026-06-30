import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { exams } from "./exams"
import { jobStatusEnum } from "./ingest-jobs"

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  status: jobStatusEnum("status").default("queued").notNull(),
  questionsTarget: integer("questions_target").notNull(),
  questionsDone: integer("questions_done").default(0).notNull(),
  inputJson: jsonb("input_json").$type<Record<string, unknown>>(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})
