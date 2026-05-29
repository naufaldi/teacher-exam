import type { ExamSubject } from "@teacher-exam/shared"
import { ArrowUpDown, Search, X } from "lucide-react"
import { SUBJECT_OPTIONS } from "../../lib/subjects"
import { FILTER_SEARCH_CLASS, SELECT_CHEVRON, SELECT_CLASS } from "../shared/filter-select-styles.js"

export type StatusFilter = "all" | "final" | "draft"
export type SubjectFilter = "all" | ExamSubject
export type GradeFilter = "all" | "5" | "6"
export type PeriodFilter = "all" | "7d" | "30d" | "this_semester"
export type SortOrder = "terbaru" | "terlama" | "judul"

interface HistoryToolbarProps {
  status: StatusFilter
  subject: SubjectFilter
  grade: GradeFilter
  period: PeriodFilter
  sort: SortOrder
  query: string
  isFiltered: boolean
  matchCount: number
  totalCount: number
  onStatusChange: (s: StatusFilter) => void
  onSubjectChange: (s: SubjectFilter) => void
  onGradeChange: (g: GradeFilter) => void
  onPeriodChange: (p: PeriodFilter) => void
  onSortChange: (s: SortOrder) => void
  onQueryChange: (q: string) => void
  onReset: () => void
}

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "final", label: "Final" },
  { id: "draft", label: "Draft" }
]

const SUBJECT_FILTER_OPTIONS: Array<{ value: SubjectFilter; label: string }> = [
  { value: "all", label: "Semua mapel" },
  ...SUBJECT_OPTIONS.map((subject) => ({ value: subject.value, label: subject.label }))
]

const GRADE_OPTIONS: Array<{ value: GradeFilter; label: string }> = [
  { value: "all", label: "Semua kelas" },
  { value: "5", label: "Kelas 5" },
  { value: "6", label: "Kelas 6" }
]

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Semua periode" },
  { value: "7d", label: "7 hari terakhir" },
  { value: "30d", label: "30 hari terakhir" },
  { value: "this_semester", label: "Semester ini" }
]

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terlama", label: "Terlama" },
  { value: "judul", label: "Judul (A–Z)" }
]

function HistoryToolbar({
  grade,
  isFiltered,
  matchCount,
  onGradeChange,
  onPeriodChange,
  onQueryChange,
  onReset,
  onSortChange,
  onStatusChange,
  onSubjectChange,
  period,
  query,
  sort,
  status,
  subject,
  totalCount
}: HistoryToolbarProps) {
  return (
    <div className="rounded-md border border-border-default bg-bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border-default">
        <div className="inline-flex items-center rounded-pill border border-border-default bg-kertas-50 p-1">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusChange(tab.id)}
                className={[
                  "h-7 px-3 rounded-pill text-body-sm font-medium transition-colors duration-[120ms]",
                  active
                    ? "bg-bg-surface text-primary-700 shadow-xs border border-border-default"
                    : "text-text-tertiary hover:text-text-primary"
                ].join(" ")}
                aria-pressed={active}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value as SubjectFilter)}
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Filter mata pelajaran"
          >
            {SUBJECT_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={grade}
            onChange={(e) => onGradeChange(e.target.value as GradeFilter)}
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Filter kelas"
          >
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)}
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Filter periode"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Cari judul atau topik…"
              className={FILTER_SEARCH_CLASS}
            />
          </div>

          <div className="relative">
            <ArrowUpDown
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOrder)}
              className={`${SELECT_CLASS} pl-8`}
              style={{ backgroundImage: SELECT_CHEVRON }}
              aria-label="Urutkan"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-kertas-50">
        <span className="text-body-sm text-text-tertiary">
          Menampilkan <span className="text-text-primary font-semibold tabular-nums">{matchCount}</span> dari{" "}
          <span className="tabular-nums">{totalCount}</span> lembar
        </span>
        {isFiltered ?
          (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-[120ms]"
            >
              <X size={13} />
              Reset filter
            </button>
          ) :
          null}
      </div>
    </div>
  )
}

export { HistoryToolbar }
