import { Schema } from "effect"

const ID_MONTHS: Readonly<Record<string, number>> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12
}

const idLongFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric"
})

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function calendarDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return `${String(year)}-${pad2(month)}-${pad2(day)}`
}

/** Normalizes a teacher-entered exam date to `YYYY-MM-DD` when the text is a known date. */
export function canonicalizeExamDate(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return ""

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed)
  if (iso?.[1] !== undefined && iso[2] !== undefined && iso[3] !== undefined) {
    return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? trimmed
  }

  const long = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed)
  if (long?.[1] !== undefined && long[2] !== undefined && long[3] !== undefined) {
    const month = ID_MONTHS[long[2].toLowerCase()]
    if (month !== undefined) {
      return calendarDate(Number(long[3]), month, Number(long[1])) ?? trimmed
    }
  }

  return trimmed
}

/** Long Indonesian label for a stored exam date, or the original text when it is not a date. */
export function formatExamDateLabel(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return ""
  const canonical = canonicalizeExamDate(trimmed)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(canonical)
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return trimmed
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return trimmed
  return idLongFormatter.format(date)
}

/** Read-path exam date: empty becomes null, known dates become `YYYY-MM-DD`. */
export function normalizeStoredExamDate(value: string | null | undefined): string | null {
  if (value == null) return null
  const canonical = canonicalizeExamDate(value)
  if (canonical.length === 0) return null
  return canonical
}

export const ExamDateInputSchema = Schema.String.pipe(
  Schema.transform(Schema.String, {
    strict: true,
    decode: (value) => canonicalizeExamDate(value),
    encode: (value) => value
  })
)
export type ExamDateInput = typeof ExamDateInputSchema.Type
