import type { ExamSubject, GenerateExamInput } from "@teacher-exam/shared"

export function isMatematikaSubjectLabel(label: string | undefined): boolean {
  return (label?.trim().toLowerCase() ?? "") === "matematika"
}

export function shouldValidateLatexForGenerate(input: {
  sourceMode: NonNullable<GenerateExamInput["sourceMode"]> | "default"
  subject?: ExamSubject
  subjectLabel?: string
}): boolean {
  if (input.subject === "matematika") return true
  return isMatematikaSubjectLabel(input.subjectLabel)
}
