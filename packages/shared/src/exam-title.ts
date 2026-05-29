export interface FormatExamTitleInput {
  subjectLabel: string
  grade: number
  examType: string
  examDate: string | null
  topics: ReadonlyArray<string>
}

export function formatExamTitle(input: FormatExamTitleInput): string {
  const { examDate, examType, grade, subjectLabel, topics } = input

  const topicSegment = topics.join(", ")
  const typeSegment = examType.trim() || topicSegment
  const dateSegment = examDate
    ? new Date(examDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
    : null

  const parts = [
    `${subjectLabel} / Kelas ${grade}`,
    ...(typeSegment ? [typeSegment] : []),
    ...(dateSegment ? [dateSegment] : [])
  ]

  return parts.join(" / ").slice(0, 80)
}
