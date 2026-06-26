import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { classes, students } from "./classes"
import { exams } from "./exams"

export const examSessionStatusEnum = pgEnum("exam_session_status", [
  "scheduled",
  "open",
  "closed"
])

export const examSessions = pgTable(
  "exam_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sessionCode: text("session_code").notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes"),
    status: examSessionStatusEnum("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("exam_sessions_exam_id_idx").on(t.examId),
    index("exam_sessions_session_code_idx").on(t.sessionCode),
    index("exam_sessions_class_id_idx").on(t.classId)
  ]
)

export const sessionStudents = pgTable(
  "session_students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => examSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
    studentName: text("student_name").notNull(),
    identifier: text("identifier"),
    token: text("token").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    answers: jsonb("answers")
  },
  (t) => [
    index("session_students_session_id_idx").on(t.sessionId),
    index("session_students_token_idx").on(t.token)
  ]
)
