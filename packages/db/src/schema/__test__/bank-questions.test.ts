import { describe, expect, test } from "vitest"
import { bankQuestions } from "../bank-questions.js"

describe("bank_questions table schema", () => {
  test("type column has mcq_single default", () => {
    const col = bankQuestions.type
    expect(col).toBeDefined()
    expect((col as { notNull: boolean }).notNull).toBe(true)
    expect((col as { default: string }).default).toBe("mcq_single")
  })

  test("payload column is required", () => {
    expect((bankQuestions.payload as { notNull: boolean }).notNull).toBe(true)
  })

  test("isPublic defaults to false", () => {
    expect((bankQuestions.isPublic as { notNull: boolean }).notNull).toBe(true)
    expect((bankQuestions.isPublic as { default: boolean }).default).toBe(false)
  })

  test("usageCount defaults to 0", () => {
    expect((bankQuestions.usageCount as { notNull: boolean }).notNull).toBe(true)
    expect((bankQuestions.usageCount as { default: number }).default).toBe(0)
  })

  test("grade is integer notNull", () => {
    expect((bankQuestions.grade as { notNull: boolean }).notNull).toBe(true)
  })
})
