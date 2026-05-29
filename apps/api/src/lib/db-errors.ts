export const EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE = "Database belum di-migrate untuk mapel ini. Jalankan: pnpm db:migrate"

export function isExamSubjectEnumMismatch(err: unknown): boolean {
  return walkErrorChain(err, (node) => {
    const code = node["code"]
    const message = node["message"]
    return (
      code === "22P02" &&
      typeof message === "string" &&
      message.includes("exam_subject")
    )
  })
}

function walkErrorChain(
  err: unknown,
  predicate: (node: Record<string, unknown>) => boolean
): boolean {
  const seen = new Set<unknown>()
  let current: unknown = err

  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current)
    if (!isRecord(current)) break
    if (predicate(current)) return true
    current = current["cause"]
  }

  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
