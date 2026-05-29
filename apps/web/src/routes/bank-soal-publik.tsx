import { createFileRoute, Link } from "@tanstack/react-router"
import type { BrowseBankQuery, PublicBankQuestion } from "@teacher-exam/shared"
import { Button, EmptyState, LoadingSpinner, PageHeader } from "@teacher-exam/ui"
import { BookOpen } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BankQuestionCard } from "../components/bank/bank-question-card.js"
import { BankQuestionPreviewDialog } from "../components/bank/bank-question-preview-dialog.js"
import {
  type BankDifficultyFilter,
  type BankGradeFilter,
  type BankSortFilter,
  type BankSubjectFilter,
  BankToolbar,
  type BankTypeFilter
} from "../components/bank/bank-toolbar.js"
import { PublicPageShell } from "../components/layout/public-page-shell.js"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/bank-soal-publik")({
  component: BankSoalPublikPage
})

function BankSoalPublikPage() {
  const [items, setItems] = useState<Array<PublicBankQuestion>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState<BankSubjectFilter>("")
  const [grade, setGrade] = useState<BankGradeFilter>("")
  const [difficulty, setDifficulty] = useState<BankDifficultyFilter>("")
  const [topic, setTopic] = useState("")
  const [type, setType] = useState<BankTypeFilter>("")
  const [author, setAuthor] = useState("")
  const [sort, setSort] = useState<BankSortFilter>("terbaru")
  const [previewItem, setPreviewItem] = useState<PublicBankQuestion | null>(null)

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
      ...(author.trim() ? { author: author.trim() } : {}),
      ...(search.trim() ? { search: search.trim() } : {})
    }
  }, [subject, grade, difficulty, topic, type, author, sort, search, page, limit])

  const isFiltered = Boolean(
    subject || grade || difficulty || topic.trim() || type || author.trim() || search.trim()
  )

  const loadBank = useCallback(() => {
    setLoading(true)
    setError(null)
    api.bank
      .browsePublic(query)
      .then((result) => {
        const response = unwrapApiEither(result)
        setItems([...response.data])
        setTotal(response.total)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memuat bank soal publik")
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
    setSearch("")
    setSubject("")
    setGrade("")
    setDifficulty("")
    setTopic("")
    setType("")
    setAuthor("")
    setSort("terbaru")
  }

  return (
    <PublicPageShell>
      <div className="space-y-6">
        <div className="rounded-md border border-info-border bg-info-bg px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-text-secondary">
            Jelajahi soal publik dari guru lain. Login untuk menyimpan dan merakit ujian sendiri.
          </p>
          <Button asChild variant="primary" size="sm">
            <Link to="/">Login untuk simpan &amp; buat ujian sendiri</Link>
          </Button>
        </div>

        <PageHeader
          title="Bank Soal Publik"
          subtitle="Soal yang dibagikan guru lain. Read-only — tidak ada simpan atau edit."
        />

        <BankToolbar
          search={search}
          subject={subject}
          grade={grade}
          difficulty={difficulty}
          topic={topic}
          type={type}
          author={author}
          sort={sort}
          showAuthorFilter
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

        {loading ?
          (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) :
          null}

        {!loading && error ?
          (
            <EmptyState
              title="Gagal memuat bank soal publik"
              description={error}
              action={
                <Button variant="primary" size="md" onClick={loadBank}>
                  Coba lagi
                </Button>
              }
            />
          ) :
          null}

        {!loading && !error && items.length === 0 ?
          (
            <EmptyState
              icon={<BookOpen size={24} className="text-text-tertiary" />}
              title="Belum ada soal publik"
              description="Soal akan muncul setelah guru membagikan ujian dari Riwayat."
            />
          ) :
          null}

        {!loading && !error && items.length > 0 ?
          (
            <>
              <div className="grid gap-4">
                {items.map((item) => (
                  <BankQuestionCard
                    key={item.id}
                    item={item}
                    authorName={item.authorName}
                    onSelect={(selected) => setPreviewItem(selected as PublicBankQuestion)}
                  />
                ))}
              </div>
              {totalPages > 1 ?
                (
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
                ) :
                null}
            </>
          ) :
          null}

        <BankQuestionPreviewDialog
          item={previewItem}
          open={previewItem !== null}
          onClose={() => setPreviewItem(null)}
        />
      </div>
    </PublicPageShell>
  )
}
