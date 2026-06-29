import { describe, expect, it } from "vitest"
import { makeExam } from "../../../test/fixtures/exam.js"
import { getSheetActions, getSheetColumns, resolveTitleClickAction } from "../sheet-table.actions.js"
import { bankSheetToSheetRow, examToSheetRow } from "../sheet-table.adapters.js"

describe("getSheetColumns", () => {
  it("dashboard-recent omits soal column", () => {
    expect(getSheetColumns("dashboard-recent")).not.toContain("soal")
    expect(getSheetColumns("dashboard-recent")).toContain("status")
  })

  it("history includes soal and status", () => {
    expect(getSheetColumns("history")).toEqual([
      "lembar",
      "subject",
      "date",
      "soal",
      "status",
      "actions"
    ])
  })

  it("bank-mine includes visibility", () => {
    expect(getSheetColumns("bank-mine")).toContain("visibility")
  })

  it("bank-public includes author", () => {
    expect(getSheetColumns("bank-public")).toContain("author")
  })
})

describe("getSheetActions", () => {
  const draftRow = examToSheetRow(makeExam({ status: "draft" }))
  const finalRow = examToSheetRow(makeExam({ status: "final" }))
  const bankRow = bankSheetToSheetRow({
    id: makeExam().id,
    userId: makeExam().userId,
    title: "Bank",
    subject: "matematika",
    grade: 5,
    difficulty: "sedang",
    topics: ["A"],
    examType: "formatif",
    status: "final",
    isPublic: false,
    questionCount: 20,
    bankedAt: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z"
  })

  it("history draft shows edit and duplicate, not preview", () => {
    const ids = getSheetActions("history", draftRow).map((a) => a.id)
    expect(ids).toContain("edit")
    expect(ids).toContain("duplicate")
    expect(ids).not.toContain("preview")
  })

  it("history final shows preview and share", () => {
    const ids = getSheetActions("history", finalRow).map((a) => a.id)
    expect(ids).toContain("preview")
    expect(ids).toContain("share")
    expect(ids).not.toContain("edit")
  })

  it("bank-mine shows use-sheet and preview", () => {
    const ids = getSheetActions("bank-mine", bankRow).map((a) => a.id)
    expect(ids).toContain("use-sheet")
    expect(ids).toContain("preview")
    expect(ids).toContain("toggle-public")
  })

  it("bank-public readOnly hides use-sheet", () => {
    const ids = getSheetActions("bank-public", bankRow, { readOnly: true }).map((a) => a.id)
    expect(ids).not.toContain("use-sheet")
    expect(ids).toContain("preview")
  })

  it("dashboard final title opens preview", () => {
    expect(resolveTitleClickAction(finalRow)).toBe("preview")
    expect(resolveTitleClickAction(draftRow)).toBe("edit")
  })
})
