import { describe, expect, it } from "vitest"
import { buildFeedbackSummary, toFeedbackCsv } from "../feedback-report.js"

const rows = [
  {
    teacherEmail: "guru1@example.com",
    examId: "exam-1",
    title: "Bahasa Indonesia Kelas 3",
    subject: "bahasa_indonesia",
    subjectLabel: null,
    grade: 3,
    sourceMode: "default",
    trigger: "export_pdf",
    readiness: "ready",
    firstExportAt: new Date("2026-07-23T08:00:00Z"),
    answeredAt: new Date("2026-07-23T08:01:00Z")
  },
  {
    teacherEmail: "guru2@example.com",
    examId: "exam-2",
    title: "PKN Kelas 3",
    subject: "pendidikan_pancasila",
    subjectLabel: null,
    grade: 3,
    sourceMode: "pdf_guru",
    trigger: "print_intent",
    readiness: "ready_after_edit",
    firstExportAt: new Date("2026-07-23T09:00:00Z"),
    answeredAt: new Date("2026-07-23T09:02:00Z")
  },
  {
    teacherEmail: "guru1@example.com",
    examId: "exam-3",
    title: "IPAS Kelas 5",
    subject: "ipas",
    subjectLabel: null,
    grade: 5,
    sourceMode: "combine",
    trigger: "export_docx",
    readiness: null,
    firstExportAt: new Date("2026-07-23T10:00:00Z"),
    answeredAt: null
  }
] as const

describe("feedback report", () => {
  it("computes denominator, response rate, and readiness percentages", () => {
    const summary = buildFeedbackSummary(rows)
    expect(summary.exportedSheets).toBe(3)
    expect(summary.answeredSheets).toBe(2)
    expect(summary.responseRate).toBeCloseTo(66.67, 2)
    expect(summary.readiness.ready).toBe(50)
    expect(summary.readiness.ready_after_edit).toBe(50)
    expect(summary.readiness.not_ready).toBe(0)
    expect(summary.byTrigger.print_intent?.exportedSheets).toBe(1)
  })

  it("creates controlled follow-up CSV with escaped metadata", () => {
    const csv = toFeedbackCsv([
      { ...rows[0], title: "Soal, \"Percobaan\"" }
    ])
    expect(csv).toContain("teacher_email,exam_id")
    expect(csv).toContain("\"Soal, \"\"Percobaan\"\"\"")
    expect(csv).toContain("guru1@example.com")
  })
})
