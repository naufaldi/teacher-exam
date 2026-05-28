import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type {
  BankQuestion,
  BrowseBankQuery,
  ExamSubject,
  PublicBankQuestion,
} from '@teacher-exam/shared'
import { BookOpen } from 'lucide-react'
import { Button, EmptyState, LoadingSpinner, PageHeader } from '@teacher-exam/ui'
import { BankBuilderDialog } from '../components/bank/bank-builder-dialog.js'
import { BankQuestionCard } from '../components/bank/bank-question-card.js'
import { BankQuestionPreviewDialog } from '../components/bank/bank-question-preview-dialog.js'
import { BankStatsSummary } from '../components/bank/bank-stats-summary.js'
import {
  BankToolbar,
  type BankDifficultyFilter,
  type BankGradeFilter,
  type BankSortFilter,
  type BankSubjectFilter,
  type BankTypeFilter,
} from '../components/bank/bank-toolbar.js'
import { api, unwrapApiEither } from '../lib/api.js'

export const Route = createFileRoute('/_auth/bank-soal')({
  component: BankSoalPage,
})

type BankTab = 'mine' | 'public'

function BankSoalPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<BankTab>('mine')
  const [ownItems, setOwnItems] = useState<BankQuestion[]>([])
  const [publicItems, setPublicItems] = useState<PublicBankQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState<BankSubjectFilter>('')
  const [grade, setGrade] = useState<BankGradeFilter>('')
  const [difficulty, setDifficulty] = useState<BankDifficultyFilter>('')
  const [topic, setTopic] = useState('')
  const [type, setType] = useState<BankTypeFilter>('')
  const [author, setAuthor] = useState('')
  const [sort, setSort] = useState<BankSortFilter>('terbaru')
  const [previewItem, setPreviewItem] = useState<BankQuestion | PublicBankQuestion | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderLoading, setBuilderLoading] = useState(false)

  const query = useMemo((): BrowseBankQuery => {
    return {
      page,
      limit,
      sort,
      ...(subject ? { subject } : {}),
      ...(grade ? { grade: Number(grade) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      ...(type ? { type } : {}),
      ...(tab === 'public' && author.trim() ? { author: author.trim() } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }
  }, [subject, grade, difficulty, topic, type, author, sort, search, page, limit, tab])

  const isFiltered = Boolean(
    subject || grade || difficulty || topic.trim() || type || author.trim() || search.trim(),
  )

  const loadBank = useCallback(() => {
    setLoading(true)
    setError(null)
    const request =
      tab === 'mine'
        ? api.bank.browse(query)
        : api.bank.browsePublic(query)
    request
      .then((result) => {
        if (tab === 'mine') {
          const response = unwrapApiEither(result as Awaited<ReturnType<typeof api.bank.browse>>)
          setOwnItems([...response.data])
          setTotal(response.total)
        } else {
          const response = unwrapApiEither(result as Awaited<ReturnType<typeof api.bank.browsePublic>>)
          setPublicItems([...response.data])
          setTotal(response.total)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat bank soal')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [query, tab])

  useEffect(() => {
    loadBank()
  }, [loadBank])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const displayItems = tab === 'mine' ? ownItems : publicItems

  const handleResetFilters = () => {
    setPage(1)
    setSearch('')
    setSubject('')
    setGrade('')
    setDifficulty('')
    setTopic('')
    setType('')
    setAuthor('')
    setSort('terbaru')
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 50) return prev
      return [...prev, id]
    })
  }

  const defaultSubject: ExamSubject =
    ownItems.find((item) => selectedIds.includes(item.id))?.subject ?? 'ipas'
  const defaultGrade =
    ownItems.find((item) => selectedIds.includes(item.id))?.grade ?? 5

  const handleBuildExam = (metadata: Parameters<typeof api.bank.buildExam>[0]['metadata']) => {
    setBuilderLoading(true)
    void api.bank
      .buildExam({
        bankQuestionIds: selectedIds,
        metadata,
      })
      .then((result) => {
        const response = unwrapApiEither(result)
        setBuilderOpen(false)
        void navigate({ to: '/preview', search: { examId: response.examId } })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal membuat ujian')
      })
      .finally(() => {
        setBuilderLoading(false)
      })
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Bank Soal"
        subtitle="Soal yang diterima dari generate otomatis tersimpan di sini. Bagikan ujian dari Riwayat untuk memublikasikan soal terkait."
      />

      <div className="flex flex-wrap gap-2 border-b border-border-default">
        <button
          type="button"
          onClick={() => {
            setTab('mine')
            setPage(1)
          }}
          className={`px-4 py-2 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'mine'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Bank Saya
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('public')
            setPage(1)
          }}
          className={`px-4 py-2 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'public'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Bank Publik
        </button>
      </div>

      {tab === 'mine' ? <BankStatsSummary items={ownItems} /> : null}

      <BankToolbar
        search={search}
        subject={subject}
        grade={grade}
        difficulty={difficulty}
        topic={topic}
        type={type}
        author={author}
        sort={sort}
        showAuthorFilter={tab === 'public'}
        isFiltered={isFiltered}
        matchCount={displayItems.length}
        totalCount={total}
        onSearchChange={(value) => {
          setPage(1)
          setSearch(value)
        }}
        onSubjectChange={(value) => {
          setPage(1)
          setSubject(value)
        }}
        onGradeChange={(value) => {
          setPage(1)
          setGrade(value)
        }}
        onDifficultyChange={(value) => {
          setPage(1)
          setDifficulty(value)
        }}
        onTopicChange={(value) => {
          setPage(1)
          setTopic(value)
        }}
        onTypeChange={(value) => {
          setPage(1)
          setType(value)
        }}
        onAuthorChange={(value) => {
          setPage(1)
          setAuthor(value)
        }}
        onSortChange={(value) => {
          setPage(1)
          setSort(value)
        }}
        onReset={handleResetFilters}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : null}

      {!loading && error ? (
        <EmptyState
          title="Gagal memuat bank soal"
          description={error}
          action={
            <Button variant="primary" size="md" onClick={loadBank}>
              Coba lagi
            </Button>
          }
        />
      ) : null}

      {!loading && !error && displayItems.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} className="text-text-tertiary" />}
          title={tab === 'mine' ? 'Bank soal masih kosong' : 'Belum ada soal publik'}
          description={
            tab === 'mine'
              ? 'Generate ujian dan terima soal di Review. Soal yang diterima akan otomatis masuk ke bank.'
              : 'Soal publik dari guru lain akan muncul di sini.'
          }
          action={
            tab === 'mine' ? (
              <Button asChild variant="primary" size="md">
                <Link to="/generate">Generate ujian</Link>
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!loading && !error && displayItems.length > 0 ? (
        <>
          <div className="grid gap-4">
            {tab === 'mine'
              ? ownItems.map((item) => (
                  <BankQuestionCard
                    key={item.id}
                    item={item}
                    selectable
                    selected={selectedIds.includes(item.id)}
                    onSelect={(selected) => setPreviewItem(selected as BankQuestion)}
                    onToggleSelect={(selected) => toggleSelect(selected.id)}
                  />
                ))
              : publicItems.map((item) => (
                  <BankQuestionCard
                    key={item.id}
                    item={item}
                    authorName={item.authorName}
                    showUsageByOthers
                    onSelect={(selected) => setPreviewItem(selected as PublicBankQuestion)}
                  />
                ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <span className="text-body-sm text-text-secondary">
                Halaman {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <BankQuestionPreviewDialog
        item={previewItem}
        open={previewItem !== null}
        onClose={() => setPreviewItem(null)}
      />

      {tab === 'mine' && selectedIds.length > 0 ? (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border-default bg-bg-surface/95 backdrop-blur-sm">
          <div className="max-w-[var(--container-app)] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-body-sm font-medium text-text-primary">
              {selectedIds.length} soal dipilih
            </span>
            <Button
              variant="primary"
              size="md"
              disabled={selectedIds.length < 5}
              onClick={() => setBuilderOpen(true)}
            >
              Buat Ujian
            </Button>
          </div>
        </div>
      ) : null}

      <BankBuilderDialog
        open={builderOpen}
        selectedCount={selectedIds.length}
        defaultSubject={defaultSubject}
        defaultGrade={defaultGrade}
        loading={builderLoading}
        onClose={() => setBuilderOpen(false)}
        onSubmit={handleBuildExam}
      />
    </div>
  )
}
