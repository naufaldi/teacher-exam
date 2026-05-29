/**
 * Best-effort fixes for common LLM JSON shape mistakes before Effect Schema decode.
 */
export function normalizeGeneratedQuestionItem(item: unknown): unknown {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return item
  }

  const record = { ...(item as Record<string, unknown>) }

  if (typeof record["correct_answer"] === "string") {
    record["correct_answer"] = record["correct_answer"].toLowerCase()
  }

  if (Array.isArray(record["correct_answers"])) {
    record["correct_answers"] = record["correct_answers"].map((letter) =>
      typeof letter === "string" ? letter.toLowerCase() : letter
    )
  }

  if (Array.isArray(record["statements"])) {
    record["statements"] = record["statements"].map((stmt) => {
      if (stmt === null || typeof stmt !== "object") return stmt
      const s = { ...(stmt as Record<string, unknown>) }
      if (typeof s["answer"] === "string") {
        const a = s["answer"].trim()
        if (a === "Benar" || a === "benar" || a === "BENAR") s["answer"] = "B"
        if (a === "Salah" || a === "salah" || a === "SALAH") s["answer"] = "S"
      }
      return s
    })
  }

  return record
}
