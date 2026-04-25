import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { Exam } from '@teacher-exam/shared'
import { Button, LoadingSpinner, useToast } from '@teacher-exam/ui'
import {
  HistoryEmpty,
  HistoryHeader,
  HistoryPagination,
  HistoryTable,
  HistoryToolbar,
  type GradeFilter,
  type PeriodFilter,
  type SortOrder,
  type StatusFilter,
  type SubjectFilter,
} from '../components/history/index.js'
import { api, ApiError } from '../lib/api.js'
import { DuplicateConfirmDialog } from '../components/dashboard/duplicate-confirm-dialog.js'
import { useDuplicateExam } from '../hooks/use-duplicate-exam.js'

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
  const { toast } = useToast()
  const duplicate = useDuplicateExam()

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<StatusFilter>('all')
  const [subject, setSubject] = useState<SubjectFilter>('all')
  const [grade, setGrade] = useState<GradeFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOrder>('terbaru')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  function loadExams() {
    setLoading(true)
    setError(null)
    api.exams
      .list()
      .then((data) => {
        setExams(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : 'Gagal memuat data'
        setError(message)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadExams()
  }, [])

  async function handleDelete(id: string) {
    try {
      await api.exams.remove(id)
      setExams((prev) => prev.filter((e) => e.id !== id))
      toast({ variant: 'success', title: 'Lembar berhasil dihapus' })
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Gagal menghapus lembar'
      toast({ variant: 'error', title: message })
    }
  }

  const stats = useMemo(() => {
    const finalCount = exams.filter((e) => e.status === 'final').length
    const draftCount = exams.filter((e) => e.status === 'draft').length
    const thisMonthCount = exams.filter((e) => isThisMonth(e.createdAt)).length
    return {
      total: exams.length,
      finalCount,
      draftCount,
      thisMonthCount,
    }
  }, [exams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = exams.filter((exam) => {
      if (status !== 'all' && exam.status !== status) return false
      if (subject !== 'all' && exam.subject !== subject) return false
      if (grade !== 'all' && String(exam.grade) !== grade) return false
      if (!withinPeriod(exam.createdAt, period)) return false
      if (q) {
        const haystack = `${exam.title} ${exam.topics.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    return sortExams(matched, sort)
  }, [exams, status, subject, grade, period, query, sort])

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
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  useEffect(() => {
    if (safePage !== page) setPage(safePage)
  }, [safePage, page])
  const start = (safePage - 1) * pageSize
  const visibleExams = filtered.slice(start, start + pageSize)

  if (loading) {
    return <LoadingSpinner message="Memuat riwayat lembar ujian..." />
  }

  if (error !== null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-bg-surface border border-border-default rounded-md p-8 text-center max-w-sm">
          <p className="text-body text-danger-fg mb-4">{error}</p>
          <Button variant="secondary" size="md" onClick={loadExams}>
            Coba lagi
          </Button>
        </div>
      </div>
    )
  }

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
          totalCount={exams.length}
          onStatusChange={(v) => { setStatus(v); setPage(1) }}
          onSubjectChange={(v) => { setSubject(v); setPage(1) }}
          onGradeChange={(v) => { setGrade(v); setPage(1) }}
          onPeriodChange={(v) => { setPeriod(v); setPage(1) }}
          onSortChange={(v) => { setSort(v); setPage(1) }}
          onQueryChange={(v) => { setQuery(v); setPage(1) }}
          onReset={handleReset}
        />

        {filtered.length === 0 ? (
          <HistoryEmpty
            variant={exams.length === 0 ? 'truly-empty' : 'no-match'}
            onReset={handleReset}
            onGenerate={() => void navigate({ to: '/generate' })}
          />
        ) : (
          <>
            <HistoryTable
              exams={visibleExams}
              onDelete={handleDelete}
              onDuplicate={duplicate.openFor}
            />

            <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
              <span className="text-body-sm text-text-tertiary">
                Menampilkan{' '}
                <span className="text-text-primary font-semibold tabular-nums">
                  {visibleExams.length}
                </span>{' '}
                dari{' '}
                <span className="tabular-nums">{filtered.length}</span> lembar yang cocok
              </span>
              <HistoryPagination
                page={safePage}
                pageSize={pageSize}
                totalItems={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
              />
            </div>
          </>
        )}
      </section>

      {duplicate.confirmingExam && (
        <DuplicateConfirmDialog
          exam={duplicate.confirmingExam}
          open={true}
          onOpenChange={(open) => { if (!open) duplicate.close() }}
          onConfirm={() => { void duplicate.confirm() }}
          isPending={duplicate.isPending}
        />
      )}
    </div>
  )
}
