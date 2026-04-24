export interface FormatExamTitleInput {
  subjectLabel: string
  grade: number
  examType: string
  examDate: string | null
  topic: string
}

export function formatExamTitle(input: FormatExamTitleInput): string {
  const { subjectLabel, grade, examType, examDate, topic } = input

  const typeSegment = examType.trim() || topic
  const dateSegment = examDate
    ? new Date(examDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const parts = [
    `${subjectLabel} / Kelas ${grade}`,
    typeSegment,
    ...(dateSegment ? [dateSegment] : []),
  ]

  return parts.join(' / ').slice(0, 80)
}
