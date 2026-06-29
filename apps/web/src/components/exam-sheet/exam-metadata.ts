import type { PublicExam, PublicExamWithQuestions } from "@teacher-exam/shared"
import type { ExamSheetMetadata } from "./exam-sheet-types.js"

type ExamMetadataSource = Pick<
  PublicExam,
  | "schoolName"
  | "academicYear"
  | "examType"
  | "examDate"
  | "durationMinutes"
  | "instructions"
>

function toExamSheetMetadata(exam: ExamMetadataSource): ExamSheetMetadata {
  return {
    schoolName: exam.schoolName ?? "",
    academicYear: exam.academicYear ?? "",
    examType: exam.examType,
    examDate: exam.examDate ?? "",
    durationMinutes: exam.durationMinutes ?? 60,
    instructions: exam.instructions ?? ""
  }
}

function acceptedQuestions(exam: Pick<PublicExamWithQuestions, "questions">) {
  return exam.questions.filter((q) => q.status === "accepted")
}

export { acceptedQuestions, toExamSheetMetadata }
