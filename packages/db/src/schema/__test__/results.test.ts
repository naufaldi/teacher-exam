import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { sessionResults } from "../results.js"

describe("session_results table schema", () => {
  test("sessionStudentId is notNull", () => {
    expect((sessionResults.sessionStudentId as { notNull: boolean }).notNull).toBe(true)
  })

  test("sessionId is notNull", () => {
    expect((sessionResults.sessionId as { notNull: boolean }).notNull).toBe(true)
  })

  test("examId is notNull", () => {
    expect((sessionResults.examId as { notNull: boolean }).notNull).toBe(true)
  })

  test("score is notNull", () => {
    expect((sessionResults.score as { notNull: boolean }).notNull).toBe(true)
  })

  test("gradedStatus is notNull", () => {
    expect((sessionResults.gradedStatus as { notNull: boolean }).notNull).toBe(true)
  })
})

describe("session_results migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "src/migrations/0012_add_session_results.sql"),
    "utf8"
  )

  test("creates session_results table", () => {
    expect(sql).toContain("CREATE TABLE \"session_results\"")
    expect(sql).toContain("\"session_student_id\" uuid NOT NULL")
    expect(sql).toContain("\"session_id\" uuid NOT NULL")
    expect(sql).toContain("\"exam_id\" uuid NOT NULL")
    expect(sql).toContain("\"score\" integer NOT NULL")
    expect(sql).toContain("\"answers\" jsonb")
    expect(sql).toContain("\"graded_status\" \"graded_status\"")
  })

  test("creates indexes", () => {
    expect(sql).toContain("session_results_session_id_idx")
    expect(sql).toContain("session_results_session_student_id_idx")
    expect(sql).toContain("session_results_exam_id_idx")
  })

  test("adds foreign key constraints", () => {
    expect(sql).toContain("session_results_session_student_id_session_students_id_fk")
    expect(sql).toContain("session_results_session_id_exam_sessions_id_fk")
    expect(sql).toContain("session_results_exam_id_exams_id_fk")
  })
})
