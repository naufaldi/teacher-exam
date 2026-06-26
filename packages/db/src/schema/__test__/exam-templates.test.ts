import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { examTemplates } from "../exam-templates.js"

describe("exam_templates table schema", () => {
  test("userId is notNull", () => {
    expect((examTemplates.userId as { notNull: boolean }).notNull).toBe(true)
  })

  test("name is notNull", () => {
    expect((examTemplates.name as { notNull: boolean }).notNull).toBe(true)
  })

  test("config jsonb is notNull", () => {
    expect((examTemplates.config as { notNull: boolean }).notNull).toBe(true)
  })

  test("usageCount defaults to 0", () => {
    expect((examTemplates.usageCount as { notNull: boolean }).notNull).toBe(true)
    expect((examTemplates.usageCount as { default: number }).default).toBe(0)
  })
})

describe("exam_templates migration", () => {
  test("creates exam_templates table with user_id index", () => {
    const sql = readFileSync(
      join(process.cwd(), "src/migrations/0009_add_exam_templates.sql"),
      "utf8"
    )
    expect(sql).toContain("CREATE TABLE \"exam_templates\"")
    expect(sql).toContain("exam_templates_user_id_idx")
    expect(sql).toContain("\"user_id\" text NOT NULL")
    expect(sql).toContain("\"config\" jsonb")
  })
})
