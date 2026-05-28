import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { BankQuestion, BrowseBankQuery } from '@teacher-exam/shared'
import { BookOpen } from 'lucide-react'
import { Button, EmptyState, LoadingSpinner, PageHeader } from '@teacher-exam/ui'
import { BankQuestionCard } from '../components/bank/bank-question-card.js'
import { BankQuestionPreviewDialog } from '../components/bank/bank-question-preview-dialog.js'
import {
  BankToolbar,
  type BankDifficultyFilter,
  type BankGradeFilter,
  type BankSubjectFilter,
} from '../components/bank/bank-toolbar.js'
import { api, unwrapApiEither } from '../lib/api.js'

export const Route = createFileRoute('/_auth/bank-soal')({
  component: BankSoalPage,
})

function BankSoalPage() {
  const [items, setItems] = useState<BankQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState<BankSubjectFilter>('')
  const [grade, setGrade] = useState<BankGradeFilter>('')
  const [difficulty, setDifficulty] = useState<BankDifficultyFilter>('')
  const [previewItem, setPreviewItem] = useState<BankQuestion | null>(null)

  const query = useMemo((): BrowseBankQuery => {
    return {
      page,
      limit,
      ...(subject ? { subject } : {}),
      ...(grade ? { grade: Number(grade) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }
  }, [subject, grade, difficulty, search, page, limit])

  const isFiltered = Boolean(subject || grade || difficulty || search.trim())

  const loadBank = useCallback(() => {
    setLoading(true)
    setError(null)
    api.bank
      .browse(query)
      .then((result) => {
        const response = unwrapApiEither(result)
        setItems([...response.data])
        setTotal(response.total)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat bank soal')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [query])

  useEffect(() => {
    loadBank()
  }, [loadBank])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleResetFilters = () => {
    setPage(1)
    setSearch('')
    setSubject('')
    setGrade('')
    setDifficulty('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal"
        subtitle="Soal yang diterima dari generate otomatis tersimpan di sini. Bagikan ujian dari Riwayat untuk memublikasikan soal terkait."
      />

      <BankToolbar
        search={search}
        subject={subject}
        grade={grade}
        difficulty={difficulty}
        isFiltered={isFiltered}
        matchCount={items.length}
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

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} className="text-text-tertiary" />}
          title="Bank soal masih kosong"
          description="Generate ujian dan terima soal di Review. Soal yang diterima akan otomatis masuk ke bank."
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/generate">Generate ujian</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className="grid gap-4">
            {items.map((item) => (
              <BankQuestionCard
                key={item.id}
                item={item}
                onSelect={(selected) => setPreviewItem(selected)}
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
    </div>
  )
}
