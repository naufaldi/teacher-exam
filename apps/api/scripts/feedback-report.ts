import pg from "pg"

type Readiness = "ready" | "ready_after_edit" | "not_ready"
type Trigger = "export_pdf" | "export_docx" | "print_intent"

export interface FeedbackReportRow {
  teacherEmail: string
  examId: string
  title: string
  subject: string | null
  subjectLabel: string | null
  grade: number
  sourceMode: string
  trigger: Trigger
  readiness: Readiness | null
  firstExportAt: Date
  answeredAt: Date | null
}

interface SegmentSummary {
  exportedSheets: number
  answeredSheets: number
  responseRate: number
}

export interface FeedbackSummary extends SegmentSummary {
  readiness: Record<Readiness, number>
  bySubject: Record<string, SegmentSummary>
  byGrade: Record<string, SegmentSummary>
  bySourceMode: Record<string, SegmentSummary>
  byTrigger: Partial<Record<Trigger, SegmentSummary>>
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 10_000) / 100
}

function segment(rows: ReadonlyArray<FeedbackReportRow>): SegmentSummary {
  const answeredSheets = rows.filter((row) => row.readiness !== null).length
  return {
    exportedSheets: rows.length,
    answeredSheets,
    responseRate: percentage(answeredSheets, rows.length)
  }
}

function groupBy(
  rows: ReadonlyArray<FeedbackReportRow>,
  keyOf: (row: FeedbackReportRow) => string
): Record<string, SegmentSummary> {
  const groups = new Map<string, Array<FeedbackReportRow>>()
  for (const row of rows) {
    const key = keyOf(row)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return Object.fromEntries(
    Array.from(groups.entries()).map(([key, values]) => [key, segment(values)])
  )
}

export function buildFeedbackSummary(
  rows: ReadonlyArray<FeedbackReportRow>
): FeedbackSummary {
  const answered = rows.filter((row) => row.readiness !== null)
  const base = segment(rows)
  return {
    ...base,
    readiness: {
      ready: percentage(answered.filter((row) => row.readiness === "ready").length, answered.length),
      ready_after_edit: percentage(
        answered.filter((row) => row.readiness === "ready_after_edit").length,
        answered.length
      ),
      not_ready: percentage(
        answered.filter((row) => row.readiness === "not_ready").length,
        answered.length
      )
    },
    bySubject: groupBy(rows, (row) => row.subjectLabel ?? row.subject ?? "unknown"),
    byGrade: groupBy(rows, (row) => String(row.grade)),
    bySourceMode: groupBy(rows, (row) => row.sourceMode),
    byTrigger: groupBy(rows, (row) => row.trigger)
  }
}

function csvCell(value: string | number | null): string {
  if (value === null) return ""
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text
}

export function toFeedbackCsv(rows: ReadonlyArray<FeedbackReportRow>): string {
  const header = [
    "teacher_email",
    "exam_id",
    "title",
    "subject",
    "subject_label",
    "grade",
    "source_mode",
    "trigger",
    "readiness",
    "first_export_at",
    "answered_at"
  ]
  const body = rows.map((row) =>
    [
      row.teacherEmail,
      row.examId,
      row.title,
      row.subject,
      row.subjectLabel,
      row.grade,
      row.sourceMode,
      row.trigger,
      row.readiness,
      row.firstExportAt.toISOString(),
      row.answeredAt?.toISOString() ?? null
    ].map(csvCell).join(",")
  )
  return [header.join(","), ...body].join("\n")
}

async function loadRows(): Promise<Array<FeedbackReportRow>> {
  const connectionString = process.env["DATABASE_URL"]
  if (!connectionString) throw new Error("DATABASE_URL is required")
  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    const result = await client.query<{
      teacher_email: string
      exam_id: string
      title: string
      subject: string | null
      subject_label: string | null
      grade: number
      source_mode: string
      trigger: Trigger
      readiness: Readiness | null
      first_export_at: Date
      answered_at: Date | null
    }>(`
      SELECT
        u.email AS teacher_email,
        e.id AS exam_id,
        e.title,
        e.subject,
        e.subject_label,
        e.grade,
        e.source_mode,
        o.trigger,
        o.readiness,
        o.first_export_at,
        o.answered_at
      FROM exam_pilot_outcomes o
      INNER JOIN exams e ON e.id = o.exam_id
      INNER JOIN "user" u ON u.id = o.user_id
      ORDER BY o.first_export_at ASC
    `)
    return result.rows.map((row) => ({
      teacherEmail: row.teacher_email,
      examId: row.exam_id,
      title: row.title,
      subject: row.subject,
      subjectLabel: row.subject_label,
      grade: row.grade,
      sourceMode: row.source_mode,
      trigger: row.trigger,
      readiness: row.readiness,
      firstExportAt: row.first_export_at,
      answeredAt: row.answered_at
    }))
  } finally {
    await client.end()
  }
}

async function main(): Promise<void> {
  const rows = await loadRows()
  if (process.argv.includes("--format=csv")) {
    process.stdout.write(`${toFeedbackCsv(rows)}\n`)
    return
  }
  process.stdout.write(`${JSON.stringify(buildFeedbackSummary(rows), null, 2)}\n`)
}

if (process.argv[1]?.endsWith("feedback-report.ts")) {
  void main()
}
