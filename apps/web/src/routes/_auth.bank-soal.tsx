import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Globe, Lock, Search } from 'lucide-react'
import type { BankQuestion, BrowseBankQuery, ExamDifficulty, ExamSubject } from '@teacher-exam/shared'
import { SUBJECT_LABEL } from '@teacher-exam/shared'
import { Badge, Button, EmptyState, Input, LoadingSpinner } from '@teacher-exam/ui'
import { api, unwrapApiEither } from '../lib/api.js'

export const Route = createFileRoute('/_auth/bank-soal')({
  component: BankSoalPage,
})

const SUBJECT_OPTIONS: Array<{ value: '' | ExamSubject; label: string }> = [
  { value: '', label: 'Semua mapel' },
  { value: 'bahasa_indonesia', label: SUBJECT_LABEL.bahasa_indonesia },
  { value: 'pendidikan_pancasila', label: SUBJECT_LABEL.pendidikan_pancasila },
  { value: 'ipas', label: SUBJECT_LABEL.ipas },
  { value: 'bahasa_inggris', label: SUBJECT_LABEL.bahasa_inggris },
  { value: 'matematika', label: SUBJECT_LABEL.matematika },
]

const DIFFICULTY_OPTIONS: Array<{ value: '' | ExamDifficulty; label: string }> = [
  { value: '', label: 'Semua tingkat' },
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
  { value: 'campuran', label: 'Campuran' },
]

function BankQuestionCard({ item }: { item: BankQuestion }) {
  return (
    <article className="rounded-xl border border-border-default bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="secondary">{SUBJECT_LABEL[item.subject]}</Badge>
        <Badge variant="secondary">Kelas {item.grade}</Badge>
        <Badge variant="pill">{item.difficulty}</Badge>
        {item.isPublic ? (
          <Badge variant="success">
            <Globe size={12} className="mr-1 inline" />
            Publik
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Lock size={12} className="mr-1 inline" />
            Pribadi
          </Badge>
        )}
      </div>
      <p className="text-sm text-primary leading-relaxed line-clamp-4">{item.text}</p>
      {item.topics.length > 0 ? (
        <p className="mt-3 text-xs text-tertiary">
          Topik: {item.topics.join(', ')}
        </p>
      ) : null}
    </article>
  )
}

function BankSoalPage() {
  const [items, setItems] = useState<BankQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState<'' | ExamSubject>('')
  const [grade, setGrade] = useState<'' | '5' | '6'>('')
  const [difficulty, setDifficulty] = useState<'' | ExamDifficulty>('')

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen size={22} />
          <h1 className="text-2xl font-semibold">Bank Soal</h1>
        </div>
        <p className="text-sm text-secondary">
          Soal yang diterima dari generate otomatis tersimpan di sini. Bagikan ujian dari Riwayat untuk
          memublikasikan soal terkait.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
            placeholder="Cari teks soal..."
            className="pl-9"
          />
        </div>
        <select
          value={subject}
          onChange={(e) => {
            setPage(1)
            setSubject(e.target.value as '' | ExamSubject)
          }}
          className="h-10 rounded-lg border border-border-default bg-surface px-3 text-sm"
        >
          {SUBJECT_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={grade}
          onChange={(e) => {
            setPage(1)
            setGrade(e.target.value as '' | '5' | '6')
          }}
          className="h-10 rounded-lg border border-border-default bg-surface px-3 text-sm"
        >
          <option value="">Semua kelas</option>
          <option value="5">Kelas 5</option>
          <option value="6">Kelas 6</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => {
            setPage(1)
            setDifficulty(e.target.value as '' | ExamDifficulty)
          }}
          className="h-10 rounded-lg border border-border-default bg-surface px-3 text-sm md:col-span-2"
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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
          <p className="text-sm text-secondary">{total} soal di bank Anda</p>
          <div className="grid gap-4">
            {items.map((item) => (
              <BankQuestionCard key={item.id} item={item} />
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
              <span className="text-sm text-secondary">
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
    </div>
  )
}
