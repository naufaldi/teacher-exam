import type { Exam } from '@teacher-exam/shared'

export interface DashboardStats {
  totalSheets: number
  finalCount: number
  draftCount: number
}

export interface WeeklyActivityDay {
  day: string
  count: number
  variant: 'default' | 'secondary'
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Compute { totalSheets, finalCount, draftCount } in a single pass (Vercel js-combine-iterations).
export function computeStats(exams: Exam[]): DashboardStats {
  let totalSheets = 0
  let finalCount = 0
  let draftCount = 0
  for (const exam of exams) {
    totalSheets++
    if (exam.status === 'final') finalCount++
    else draftCount++
  }
  return { totalSheets, finalCount, draftCount }
}

// Build 7 buckets for the days ending at `now` (local time).
// Accepts `now` as a parameter for deterministic testing.
export function computeWeeklyActivity(exams: Exam[], now: Date): WeeklyActivityDay[] {
  const buckets = Array.from({ length: 7 }, (_, i): { date: Date; key: string; count: number } => {
    const d = new Date(now.getTime())
    d.setDate(d.getDate() - (6 - i))
    return { date: d, key: localDateKey(d), count: 0 }
  })

  const keyToIdx = new Map(buckets.map(({ key }, i) => [key, i]))

  for (const exam of exams) {
    const key = localDateKey(new Date(exam.createdAt))
    const idx = keyToIdx.get(key)
    if (idx !== undefined) {
      buckets[idx]!.count++
    }
  }

  return buckets.map(({ date, count }, i) => ({
    day: DAY_LABELS[date.getDay()] as string,
    count,
    variant: i === 6 ? 'secondary' : 'default',
  }))
}

// Return the first `limit` exams (server already orders by desc createdAt).
export function getRecentSheets(exams: Exam[], limit: number): Exam[] {
  return exams.slice(0, limit)
}
