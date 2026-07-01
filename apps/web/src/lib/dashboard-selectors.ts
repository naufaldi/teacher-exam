import type { Exam } from "@teacher-exam/shared"

export interface DashboardStats {
  totalSheets: number
  finalCount: number
  draftCount: number
}

export interface WeeklyActivityDay {
  day: string
  count: number
  variant: "default" | "secondary"
}

export interface WeeklyActivityResult {
  days: Array<WeeklyActivityDay>
  uniqueSheetCount: number
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function examActiveOnDay(exam: Exam, dayKey: string): boolean {
  const dateKeys = [
    localDateKey(new Date(exam.createdAt)),
    localDateKey(new Date(exam.updatedAt))
  ]
  if (exam.bankedAt) {
    dateKeys.push(localDateKey(new Date(exam.bankedAt)))
  }
  if (exam.publishedAt) {
    dateKeys.push(localDateKey(new Date(exam.publishedAt)))
  }
  return dateKeys.some((key) => key === dayKey)
}

// Compute { totalSheets, finalCount, draftCount } in a single pass (Vercel js-combine-iterations).
export function computeStats(exams: ReadonlyArray<Exam>): DashboardStats {
  let totalSheets = 0
  let finalCount = 0
  let draftCount = 0
  for (const exam of exams) {
    totalSheets++
    if (exam.status === "final") finalCount++
    else draftCount++
  }
  return { totalSheets, finalCount, draftCount }
}

// Build 7 buckets for the days ending at `now` (local time).
// Counts a sheet on each day it was created or last touched (at most once per sheet per day).
// Accepts `now` as a parameter for deterministic testing.
export function computeWeeklyActivity(exams: ReadonlyArray<Exam>, now: Date): WeeklyActivityResult {
  const buckets = Array.from({ length: 7 }, (_, i): { date: Date; key: string; count: number } => {
    const d = new Date(now.getTime())
    d.setDate(d.getDate() - (6 - i))
    return { date: d, key: localDateKey(d), count: 0 }
  })

  let uniqueSheetCount = 0

  for (const exam of exams) {
    let activeInWindow = false
    for (const bucket of buckets) {
      if (examActiveOnDay(exam, bucket.key)) {
        bucket.count++
        activeInWindow = true
      }
    }
    if (activeInWindow) {
      uniqueSheetCount++
    }
  }

  return {
    days: buckets.map(({ count, date }, i) => ({
      day: DAY_LABELS[date.getDay()] as string,
      count,
      variant: i === 6 ? "secondary" : "default"
    })),
    uniqueSheetCount
  }
}

// Return the first `limit` exams (server already orders by desc createdAt).
export function getRecentSheets(exams: ReadonlyArray<Exam>, limit: number): Array<Exam> {
  return exams.slice(0, limit)
}
