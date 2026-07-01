import { type ExamSubject, SUBJECT_LABEL } from "./schemas/primitives.js"

export function resolveExamSubjectLabel(exam: {
  subject: ExamSubject | null
  subjectLabel?: string | null
}): string {
  const custom = exam.subjectLabel?.trim()
  if (custom) return custom
  if (exam.subject) return SUBJECT_LABEL[exam.subject] ?? exam.subject
  return "Mata Pelajaran"
}
