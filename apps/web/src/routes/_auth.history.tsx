import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { Exam } from '@teacher-exam/shared'
import { Button } from '@teacher-exam/ui'
import {
  HistoryEmpty,
  HistoryHeader,
  HistoryTable,
  HistoryToolbar,
  type GradeFilter,
  type PeriodFilter,
  type SortOrder,
  type StatusFilter,
  type SubjectFilter,
} from '../components/history/index.js'
import { getMockExamHistory } from '../lib/mock-data.js'

export const Route = createFileRoute('/_auth/history')({
  component: HistoryPage,
})

function withinPeriod(createdAt: string, period: PeriodFilter): boolean {
  if (period === 'all') return true
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  if (period === '7d') return now - created <= 7 * 24 * 60 * 60 * 1000
  if (period === '30d') return now - created <= 30 * 24 * 60 * 60 * 1000
  // this_semester: rough — Jan 2026 onward (semester 2 of TA 2025/2026)
  return created >= new Date('2026-01-01T00:00:00.000Z').getTime()
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function sortExams(exams: ReadonlyArray<Exam>, order: SortOrder): Exam[] {
  const copy = [...exams]
  if (order === 'terbaru') {
    return copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }
  if (order === 'terlama') {
    return copy.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }
  return copy.sort((a, b) => a.title.localeCompare(b.title, 'id-ID'))
}

function HistoryPage() {
  const navigate = useNavigate()
  const allExams = useMemo(() => getMockExamHistory(), [])

  const [status, setStatus] = useState<StatusFilter>('all')
  const [subject, setSubject] = useState<SubjectFilter>('all')
  const [grade, setGrade] = useState<GradeFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOrder>('terbaru')
  const [visibleCount, setVisibleCount] = useState(8)

  const stats = useMemo(() => {
    const finalCount = allExams.filter((e) => e.status === 'final').length
    const draftCount = allExams.filter((e) => e.status === 'draft').length
    const thisMonthCount = allExams.filter((e) => isThisMonth(e.createdAt)).length
    return {
      total: allExams.length,
      finalCount,
      draftCount,
      thisMonthCount,
    }
  }, [allExams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = allExams.filter((exam) => {
      if (status !== 'all' && exam.status !== status) return false
      if (subject !== 'all' && exam.subject !== subject) return false
      if (grade !== 'all' && String(exam.grade) !== grade) return false
      if (!withinPeriod(exam.createdAt, period)) return false
      if (q) {
        const haystack = `${exam.title} ${exam.topic}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    return sortExams(matched, sort)
  }, [allExams, status, subject, grade, period, query, sort])

  const isFiltered =
    status !== 'all' ||
    subject !== 'all' ||
    grade !== 'all' ||
    period !== 'all' ||
    query.trim() !== ''

  const handleReset = () => {
    setStatus('all')
    setSubject('all')
    setGrade('all')
    setPeriod('all')
    setQuery('')
    setSort('terbaru')
  }

  const visibleExams = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleExams.length

  return (
    <div className="space-y-8">
      <section
        className="animate-fade-up-stagger"
        style={{ '--index': 0 } as React.CSSProperties}
      >
        <HistoryHeader
          total={stats.total}
          finalCount={stats.finalCount}
          draftCount={stats.draftCount}
          thisMonthCount={stats.thisMonthCount}
        />
      </section>

      <section
        className="space-y-4 animate-fade-up-stagger"
        style={{ '--index': 1 } as React.CSSProperties}
      >
        <HistoryToolbar
          status={status}
          subject={subject}
          grade={grade}
          period={period}
          sort={sort}
          query={query}
          isFiltered={isFiltered}
          matchCount={filtered.length}
          totalCount={allExams.length}
          onStatusChange={setStatus}
          onSubjectChange={setSubject}
          onGradeChange={setGrade}
          onPeriodChange={setPeriod}
          onSortChange={setSort}
          onQueryChange={setQuery}
          onReset={handleReset}
        />

        {filtered.length === 0 ? (
          <HistoryEmpty
            variant={allExams.length === 0 ? 'truly-empty' : 'no-match'}
            onReset={handleReset}
            onGenerate={() => void navigate({ to: '/generate' })}
          />
        ) : (
          <>
            <HistoryTable exams={visibleExams} />

            <div className="flex items-center justify-between pt-1">
              <span className="text-body-sm text-text-tertiary">
                Menampilkan{' '}
                <span className="text-text-primary font-semibold tabular-nums">
                  {visibleExams.length}
                </span>{' '}
                dari{' '}
                <span className="tabular-nums">{filtered.length}</span> lembar yang cocok
              </span>
              {hasMore ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 8)}
                >
                  Muat lebih banyak
                </Button>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
