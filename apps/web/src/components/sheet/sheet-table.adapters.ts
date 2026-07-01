import type { BankSheet, Exam, PublicBankSheet } from "@teacher-exam/shared"
import type { SheetTableRow } from "./sheet-table.types.js"

function examQuestionCount(exam: Exam): number | null {
  return exam.questionCount ?? null
}

function examToSheetRow(exam: Exam): SheetTableRow {
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    subjectLabel: exam.subjectLabel,
    grade: exam.grade,
    topics: exam.topics,
    examType: exam.examType,
    date: exam.createdAt,
    questionCount: examQuestionCount(exam),
    status: exam.status,
    reviewMode: exam.reviewMode,
    source: "exam"
  }
}

function bankSheetToSheetRow(sheet: BankSheet | PublicBankSheet): SheetTableRow {
  const base = {
    id: sheet.id,
    title: sheet.title,
    subject: sheet.subject,
    subjectLabel: sheet.subjectLabel,
    grade: sheet.grade,
    topics: sheet.topics,
    examType: sheet.examType,
    date: sheet.bankedAt,
    questionCount: sheet.questionCount,
    status: "final" as const,
    visibility: sheet.isPublic ? ("public" as const) : ("private" as const),
    source: "bank" as const
  }

  if ("authorName" in sheet) {
    return { ...base, authorName: sheet.authorName }
  }

  return base
}

export { bankSheetToSheetRow, examQuestionCount, examToSheetRow }
