import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { examSessions, sessionStudents } from "../sessions.js"

describe("exam_sessions table schema", () => {
  test("examId is notNull", () => {
    expect((examSessions.examId as { notNull: boolean }).notNull).toBe(true)
  })

  test("classId is notNull", () => {
    expect((examSessions.classId as { notNull: boolean }).notNull).toBe(true)
  })

  test("sessionCode is notNull", () => {
    expect((examSessions.sessionCode as { notNull: boolean }).notNull).toBe(true)
  })

  test("status is notNull", () => {
    expect((examSessions.status as { notNull: boolean }).notNull).toBe(true)
  })
})

describe("session_students table schema", () => {
  test("sessionId is notNull", () => {
    expect((sessionStudents.sessionId as { notNull: boolean }).notNull).toBe(true)
  })

  test("token is notNull", () => {
    expect((sessionStudents.token as { notNull: boolean }).notNull).toBe(true)
  })

  test("joinedAt is notNull", () => {
    expect((sessionStudents.joinedAt as { notNull: boolean }).notNull).toBe(true)
  })
})

describe("exam_sessions + session_students migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "src/migrations/0011_add_exam_sessions.sql"),
    "utf8"
  )

  test("creates exam_sessions table", () => {
    expect(sql).toContain("CREATE TABLE \"exam_sessions\"")
    expect(sql).toContain("\"session_code\" text NOT NULL")
    expect(sql).toContain("\"duration_minutes\" integer")
    expect(sql).toContain("\"status\" \"exam_session_status\"")
  })

  test("creates session_students table", () => {
    expect(sql).toContain("CREATE TABLE \"session_students\"")
    expect(sql).toContain("\"session_id\" uuid NOT NULL")
    expect(sql).toContain("\"student_id\" uuid")
    expect(sql).toContain("\"token\" text NOT NULL")
  })

  test("creates indexes", () => {
    expect(sql).toContain("exam_sessions_exam_id_idx")
    expect(sql).toContain("exam_sessions_session_code_idx")
    expect(sql).toContain("session_students_session_id_idx")
  })

  test("adds foreign key constraints", () => {
    expect(sql).toContain("exam_sessions_exam_id_exams_id_fk")
    expect(sql).toContain("exam_sessions_class_id_classes_id_fk")
    expect(sql).toContain("session_students_session_id_exam_sessions_id_fk")
  })
})
