export type QuestionStatus = "pending" | "accepted" | "rejected"

export const STATUS_BORDER: Record<QuestionStatus, string> = {
  accepted: "border-l-success-solid opacity-75",
  rejected: "border-l-danger-solid",
  pending: "border-l-border-default"
}

/** Academic year options centred on the current year (±5 years). */
export const ACADEMIC_YEARS = Array.from({ length: 11 }, (_, i) => {
  const start = new Date().getFullYear() - 5 + i
  return `${start}/${start + 1}`
})
