import type { BankSort, ExamDifficulty, ExamSubject, QuestionType } from "@teacher-exam/shared"
import { Search, X } from "lucide-react"
import { SUBJECT_OPTIONS } from "../../lib/subjects.js"
import { FILTER_SEARCH_CLASS, SELECT_CHEVRON, SELECT_CLASS } from "../shared/filter-select-styles.js"

export type BankSubjectFilter = "" | ExamSubject
export type BankGradeFilter = "" | "5" | "6"
export type BankDifficultyFilter = "" | ExamDifficulty
export type BankTypeFilter = "" | QuestionType
export type BankSortFilter = BankSort
export type BankTab = "mine" | "public"

interface BankToolbarProps {
  tab?: BankTab
  search: string
  subject: BankSubjectFilter
  grade: BankGradeFilter
  difficulty: BankDifficultyFilter
  topic: string
  type: BankTypeFilter
  author: string
  sort: BankSortFilter
  showAuthorFilter?: boolean
  showTypeFilter?: boolean
  itemLabel?: string
  isFiltered: boolean
  matchCount: number
  totalCount: number
  onTabChange?: (tab: BankTab) => void
  onSearchChange: (value: string) => void
  onSubjectChange: (value: BankSubjectFilter) => void
  onGradeChange: (value: BankGradeFilter) => void
  onDifficultyChange: (value: BankDifficultyFilter) => void
  onTopicChange: (value: string) => void
  onTypeChange: (value: BankTypeFilter) => void
  onAuthorChange: (value: string) => void
  onSortChange: (value: BankSortFilter) => void
  onReset: () => void
}

const SUBJECT_FILTER_OPTIONS: Array<{ value: BankSubjectFilter; label: string }> = [
  { value: "", label: "Semua mapel" },
  ...SUBJECT_OPTIONS.map((subject) => ({ value: subject.value, label: subject.label }))
]

const GRADE_OPTIONS: Array<{ value: BankGradeFilter; label: string }> = [
  { value: "", label: "Semua kelas" },
  { value: "5", label: "Kelas 5" },
  { value: "6", label: "Kelas 6" }
]

const DIFFICULTY_OPTIONS: Array<{ value: BankDifficultyFilter; label: string }> = [
  { value: "", label: "Semua tingkat" },
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
  { value: "campuran", label: "Campuran" }
]

const TYPE_OPTIONS: Array<{ value: BankTypeFilter; label: string }> = [
  { value: "", label: "Semua tipe" },
  { value: "mcq_single", label: "Pilihan ganda" },
  { value: "mcq_multi", label: "Pilihan ganda kompleks" },
  { value: "true_false", label: "Benar/Salah" }
]

const SORT_OPTIONS: Array<{ value: BankSortFilter; label: string }> = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terpopuler", label: "Terpopuler" },
  { value: "kesulitan", label: "Kesulitan" }
]

const BANK_TABS: Array<{ id: BankTab; label: string }> = [
  { id: "mine", label: "Bank Saya" },
  { id: "public", label: "Bank Publik" }
]

function BankToolbar({
  author,
  difficulty,
  grade,
  isFiltered,
  matchCount,
  onAuthorChange,
  onDifficultyChange,
  onGradeChange,
  onReset,
  onSearchChange,
  onSortChange,
  onSubjectChange,
  onTabChange,
  onTopicChange,
  onTypeChange,
  search,
  showAuthorFilter = false,
  showTypeFilter = true,
  itemLabel = "soal",
  sort,
  subject,
  tab,
  topic,
  totalCount,
  type
}: BankToolbarProps) {
  return (
    <div className="rounded-md border border-border-default bg-bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border-default">
        {onTabChange && tab ?
          (
            <div className="inline-flex items-center rounded-pill border border-border-default bg-kertas-50 p-1">
              {BANK_TABS.map((bankTab) => {
                const active = tab === bankTab.id
                return (
                  <button
                    key={bankTab.id}
                    type="button"
                    onClick={() => onTabChange(bankTab.id)}
                    className={[
                      "h-7 px-3 rounded-pill text-body-sm font-medium transition-colors duration-[120ms]",
                      active
                        ? "bg-bg-surface text-primary-700 shadow-xs border border-border-default"
                        : "text-text-tertiary hover:text-text-primary"
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {bankTab.label}
                  </button>
                )
              })}
            </div>
          ) :
          null}

        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari teks soal..."
            className={FILTER_SEARCH_CLASS}
            aria-label="Cari teks soal"
          />
        </div>

        <select
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value as BankSubjectFilter)}
          className={SELECT_CLASS}
          style={{ backgroundImage: SELECT_CHEVRON }}
          aria-label="Filter mata pelajaran"
        >
          {SUBJECT_FILTER_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={grade}
          onChange={(e) => onGradeChange(e.target.value as BankGradeFilter)}
          className={SELECT_CLASS}
          style={{ backgroundImage: SELECT_CHEVRON }}
          aria-label="Filter kelas"
        >
          {GRADE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="Topik..."
          className={`${SELECT_CLASS} min-w-[120px]`}
          aria-label="Filter topik"
        />

        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value as BankDifficultyFilter)}
          className={SELECT_CLASS}
          style={{ backgroundImage: SELECT_CHEVRON }}
          aria-label="Filter tingkat kesulitan"
        >
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {showTypeFilter ?
          (
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as BankTypeFilter)}
              className={SELECT_CLASS}
              style={{ backgroundImage: SELECT_CHEVRON }}
              aria-label="Filter tipe soal"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) :
          null}

        {showAuthorFilter ?
          (
            <input
              type="text"
              value={author}
              onChange={(e) => onAuthorChange(e.target.value)}
              placeholder="Penulis..."
              className={`${SELECT_CLASS} min-w-[120px]`}
              aria-label="Filter penulis"
            />
          ) :
          null}

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as BankSortFilter)}
          className={SELECT_CLASS}
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

      <div className="flex items-center justify-between px-4 py-2 bg-kertas-50">
        <span className="text-body-sm text-text-tertiary">
          Menampilkan <span className="text-text-primary font-semibold tabular-nums">{matchCount}</span> dari{" "}
          <span className="tabular-nums">{totalCount}</span> {itemLabel}
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

export { BankToolbar }
