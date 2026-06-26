import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { classes, students } from "../classes.js"

describe("classes table schema", () => {
  test("userId is notNull", () => {
    expect((classes.userId as { notNull: boolean }).notNull).toBe(true)
  })

  test("name is notNull", () => {
    expect((classes.name as { notNull: boolean }).notNull).toBe(true)
  })

  test("createdAt is notNull", () => {
    expect((classes.createdAt as { notNull: boolean }).notNull).toBe(true)
  })

  test("updatedAt is notNull", () => {
    expect((classes.updatedAt as { notNull: boolean }).notNull).toBe(true)
  })
})

describe("students table schema", () => {
  test("classId is notNull", () => {
    expect((students.classId as { notNull: boolean }).notNull).toBe(true)
  })

  test("name is notNull", () => {
    expect((students.name as { notNull: boolean }).notNull).toBe(true)
  })

  test("createdAt is notNull", () => {
    expect((students.createdAt as { notNull: boolean }).notNull).toBe(true)
  })
})

describe("classes + students migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "src/migrations/0010_add_classes_students.sql"),
    "utf8"
  )

  test("creates classes table", () => {
    expect(sql).toContain("CREATE TABLE \"classes\"")
    expect(sql).toContain("\"user_id\" text NOT NULL")
    expect(sql).toContain("\"name\" text NOT NULL")
    expect(sql).toContain("\"grade\" integer")
  })

  test("creates students table", () => {
    expect(sql).toContain("CREATE TABLE \"students\"")
    expect(sql).toContain("\"class_id\" uuid NOT NULL")
    expect(sql).toContain("\"name\" text NOT NULL")
    expect(sql).toContain("\"identifier\" text")
  })

  test("creates the two indexes", () => {
    expect(sql).toContain("classes_user_id_idx")
    expect(sql).toContain("students_class_id_idx")
  })

  test("adds foreign key constraints", () => {
    expect(sql).toContain("classes_user_id_user_id_fk")
    expect(sql).toContain("students_class_id_classes_id_fk")
  })
})
