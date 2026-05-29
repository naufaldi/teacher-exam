import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { examDifficultyEnum, examStatusEnum, examSubjectEnum, reviewModeEnum } from "./enums"
import { user } from "./users"

export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subject: examSubjectEnum("subject").notNull(),
  grade: integer("grade").notNull(),
  difficulty: examDifficultyEnum("difficulty").notNull(),
  topics: jsonb("topics").$type<Array<string>>().notNull().default([]),
  reviewMode: reviewModeEnum("review_mode").default("fast").notNull(),
  status: examStatusEnum("status").default("draft").notNull(),
  schoolName: text("school_name"),
  academicYear: text("academic_year"),
  examType: text("exam_type").default("TKA").notNull(),
  examDate: text("exam_date"),
  durationMinutes: integer("duration_minutes"),
  instructions: text("instructions"),
  classContext: text("class_context"),
  discussionMd: text("discussion_md"),
  isPublic: boolean("is_public").default(false).notNull(),
  publicShareSlug: text("public_share_slug").unique(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
})
