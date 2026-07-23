import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { examPilotOutcomes } from "../exam-pilot-outcomes.js"

describe("exam_pilot_outcomes schema", () => {
  it("requires ownership, exam, trigger, and first-export timestamps", () => {
    expect(examPilotOutcomes.userId.notNull).toBe(true)
    expect(examPilotOutcomes.examId.notNull).toBe(true)
    expect(examPilotOutcomes.trigger.notNull).toBe(true)
    expect(examPilotOutcomes.firstExportAt.notNull).toBe(true)
    expect(examPilotOutcomes.readiness.notNull).toBe(false)
  })

  it("has a unique exam id and cascading foreign keys in the migration", () => {
    const sql = readFileSync(
      join(process.cwd(), "src/migrations/0020_add_exam_pilot_outcomes.sql"),
      "utf8"
    )
    expect(sql).toContain("CREATE TABLE \"exam_pilot_outcomes\"")
    expect(sql).toContain("\"exam_id\" uuid NOT NULL UNIQUE")
    expect(sql).toContain("ON DELETE cascade")
    expect(sql).toContain("exam_pilot_trigger")
    expect(sql).toContain("exam_pilot_readiness")
  })
})
