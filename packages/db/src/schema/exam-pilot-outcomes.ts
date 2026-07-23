import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { examPilotReadinessEnum, examPilotTriggerEnum } from "./enums"
import { exams } from "./exams"
import { user } from "./users"

export const examPilotOutcomes = pgTable("exam_pilot_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  examId: uuid("exam_id").notNull()
    .references(() => exams.id, { onDelete: "cascade" })
    .unique(),
  trigger: examPilotTriggerEnum("trigger").notNull(),
  readiness: examPilotReadinessEnum("readiness"),
  firstExportAt: timestamp("first_export_at", { withTimezone: true }).defaultNow().notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
})
