import { describe, expect, it } from "vitest"
import { EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE, isExamSubjectEnumMismatch } from "../db-errors"

describe("isExamSubjectEnumMismatch", () => {
  it("detects Postgres 22P02 on exam_subject in nested cause", () => {
    const err = Object.assign(new Error("Failed query: insert into \"exams\""), {
      cause: {
        name: "PostgresError",
        message: "invalid input value for enum exam_subject: \"matematika\"",
        code: "22P02"
      }
    })

    expect(isExamSubjectEnumMismatch(err)).toBe(true)
  })

  it("returns false for other Postgres errors", () => {
    const err = Object.assign(new Error("Failed query"), {
      cause: {
        name: "PostgresError",
        message: "duplicate key value violates unique constraint",
        code: "23505"
      }
    })

    expect(isExamSubjectEnumMismatch(err)).toBe(false)
  })

  it("returns false for unrelated errors", () => {
    expect(isExamSubjectEnumMismatch(new Error("network"))).toBe(false)
  })
})

describe("EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE", () => {
  it("mentions db:migrate", () => {
    expect(EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE).toContain("pnpm db:migrate")
  })
})
