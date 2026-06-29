import type { Question } from "@teacher-exam/shared"

type ExamSheetMetadata = {
  schoolName: string
  academicYear: string
  examType: string
  examDate: string
  durationMinutes: number
  instructions: string
}

type ExamSheetContentProps = {
  grade: number
  metadata: ExamSheetMetadata
  questions: Array<Question>
  subjectLabel: string
  topicsLabel: string
  discussionMd?: string | null
  screenTab: "semua" | "soal" | "lj" | "kunci" | "pembahasan"
}

export type { ExamSheetContentProps, ExamSheetMetadata }
