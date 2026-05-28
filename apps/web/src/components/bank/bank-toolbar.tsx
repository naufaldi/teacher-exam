import { Search, X } from 'lucide-react'
import type { ExamDifficulty, ExamSubject } from '@teacher-exam/shared'
import { SUBJECT_OPTIONS } from '../../lib/subjects.js'
import {
  FILTER_SEARCH_CLASS,
  SELECT_CLASS,
  SELECT_CHEVRON,
} from '../shared/filter-select-styles.js'

export type BankSubjectFilter = '' | ExamSubject
export type BankGradeFilter = '' | '5' | '6'
export type BankDifficultyFilter = '' | ExamDifficulty

interface BankToolbarProps {
  search: string
  subject: BankSubjectFilter
  grade: BankGradeFilter
  difficulty: BankDifficultyFilter
  isFiltered: boolean
  matchCount: number
  totalCount: number
  onSearchChange: (value: string) => void
  onSubjectChange: (value: BankSubjectFilter) => void
  onGradeChange: (value: BankGradeFilter) => void
  onDifficultyChange: (value: BankDifficultyFilter) => void
  onReset: () => void
}

const SUBJECT_FILTER_OPTIONS: Array<{ value: BankSubjectFilter; label: string }> = [
  { value: '', label: 'Semua mapel' },
  ...SUBJECT_OPTIONS.map((subject) => ({ value: subject.value, label: subject.label })),
]

const GRADE_OPTIONS: Array<{ value: BankGradeFilter; label: string }> = [
  { value: '', label: 'Semua kelas' },
  { value: '5', label: 'Kelas 5' },
  { value: '6', label: 'Kelas 6' },
]

const DIFFICULTY_OPTIONS: Array<{ value: BankDifficultyFilter; label: string }> = [
  { value: '', label: 'Semua tingkat' },
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
  { value: 'campuran', label: 'Campuran' },
]

function BankToolbar({
  search,
  subject,
  grade,
  difficulty,
  isFiltered,
  matchCount,
  totalCount,
  onSearchChange,
  onSubjectChange,
  onGradeChange,
  onDifficultyChange,
  onReset,
}: BankToolbarProps) {
  return (
    <div className="rounded-md border border-border-default bg-bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border-default">
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
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-kertas-50">
        <span className="text-body-sm text-text-tertiary">
          Menampilkan{' '}
          <span className="text-text-primary font-semibold tabular-nums">{matchCount}</span>{' '}
          dari{' '}
          <span className="tabular-nums">{totalCount}</span> soal
        </span>
        {isFiltered ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-[120ms]"
          >
            <X size={13} />
            Reset filter
          </button>
        ) : null}
      </div>
    </div>
  )
}

export { BankToolbar }
