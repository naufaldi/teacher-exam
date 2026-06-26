import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { exams } from "./exams"
import { examSessions, sessionStudents } from "./sessions"

export const gradedStatusEnum = pgEnum("graded_status", ["auto", "manual", "pending"])

export const sessionResults = pgTable(
  "session_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionStudentId: uuid("session_student_id")
      .notNull()
      .references(() => sessionStudents.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => examSessions.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentName: text("student_name").notNull(),
    score: integer("score").notNull(),
    correctCount: integer("correct_count").notNull(),
    totalCount: integer("total_count").notNull(),
    gradedStatus: gradedStatusEnum("graded_status").notNull().default("auto"),
    answers: jsonb("answers"),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("session_results_session_id_idx").on(t.sessionId),
    index("session_results_session_student_id_idx").on(t.sessionStudentId),
    index("session_results_exam_id_idx").on(t.examId)
  ]
)
