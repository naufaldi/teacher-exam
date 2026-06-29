import { brandExamId } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { makeExam } from "../../../test/fixtures/exam.js"
import { bankSheetToSheetRow, examToSheetRow } from "../sheet-table.adapters.js"

describe("examToSheetRow", () => {
  it("maps exam fields including optional questionCount", () => {
    const row = examToSheetRow(makeExam({ questionCount: 18 } as Parameters<typeof makeExam>[0]))

    expect(row.source).toBe("exam")
    expect(row.status).toBe("draft")
    expect(row.questionCount).toBe(18)
  })

  it("leaves questionCount null when absent on exam", () => {
    const row = examToSheetRow(makeExam({ status: "final" }))

    expect(row.questionCount).toBeNull()
  })
})

describe("bankSheetToSheetRow", () => {
  it("maps bank sheet with visibility", () => {
    const exam = makeExam()
    const row = bankSheetToSheetRow({
      id: exam.id,
      userId: exam.userId,
      title: "IPAS K5",
      subject: "ipas",
      grade: 5,
      difficulty: "mudah",
      topics: ["Ekosistem"],
      examType: "formatif",
      status: "final",
      isPublic: true,
      questionCount: 20,
      bankedAt: "2026-05-21T00:00:00.000Z",
      createdAt: "2026-05-20T00:00:00.000Z"
    })

    expect(row.source).toBe("bank")
    expect(row.status).toBe("final")
    expect(row.visibility).toBe("public")
    expect(row.questionCount).toBe(20)
    expect(row.date).toBe("2026-05-21T00:00:00.000Z")
  })

  it("maps public bank sheet with authorName", () => {
    const row = bankSheetToSheetRow({
      id: brandExamId("pub-1"),
      title: "PPKN",
      subject: "pendidikan_pancasila",
      grade: 1,
      difficulty: "mudah",
      topics: ["Pancasila"],
      examType: "formatif",
      status: "final",
      isPublic: true,
      questionCount: 15,
      authorName: "Bu Siti",
      bankedAt: "2026-05-10T00:00:00.000Z",
      createdAt: "2026-05-09T00:00:00.000Z"
    })

    expect(row.authorName).toBe("Bu Siti")
  })
})
