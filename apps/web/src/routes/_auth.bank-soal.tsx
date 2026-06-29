import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import type {
  BankSheet,
  BrowseBankSheetsQuery,
  PublicBankSheet
} from "@teacher-exam/shared"
import { Button, EmptyState, LoadingSpinner, PageHeader } from "@teacher-exam/ui"
import { BookOpen } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BankSheetPreviewDialog } from "../components/bank/bank-sheet-preview-dialog.js"
import { BankSheetTable } from "../components/bank/bank-sheet-table.js"
import { BankStatsSummary } from "../components/bank/bank-stats-summary.js"
import {
  type BankDifficultyFilter,
  type BankGradeFilter,
  type BankSortFilter,
  type BankSubjectFilter,
  BankToolbar,
  type BankTypeFilter
} from "../components/bank/bank-toolbar.js"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/_auth/bank-soal")({
  component: BankSoalPage
})

type BankTab = "mine" | "public"
type BankSheetRow = BankSheet | PublicBankSheet

function BankSoalPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<BankTab>("mine")
  const [ownItems, setOwnItems] = useState<Array<BankSheet>>([])
  const [publicItems, setPublicItems] = useState<Array<PublicBankSheet>>([])
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
  const [previewSheet, setPreviewSheet] = useState<BankSheetRow | null>(null)
  const [useSheetLoadingId, setUseSheetLoadingId] = useState<string | null>(null)

  const query = useMemo((): BrowseBankSheetsQuery => {
    return {
      page,
      limit,
      sort,
      ...(subject ? { subject } : {}),
      ...(grade ? { grade: Number(grade) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      ...(tab === "public" && author.trim() ? { author: author.trim() } : {}),
      ...(search.trim() ? { search: search.trim() } : {})
    }
  }, [subject, grade, difficulty, topic, author, sort, search, page, limit, tab])

  const isFiltered = Boolean(
    subject || grade || difficulty || topic.trim() || author.trim() || search.trim()
  )

  const loadBank = useCallback(() => {
    setLoading(true)
    setError(null)
    const request = tab === "mine"
      ? api.bank.browseSheets(query)
      : api.bank.browsePublicSheets(query)
    request
      .then((result) => {
        if (tab === "mine") {
          const response = unwrapApiEither(result as Awaited<ReturnType<typeof api.bank.browseSheets>>)
          setOwnItems([...response.data])
          setTotal(response.total)
        } else {
          const response = unwrapApiEither(
            result as Awaited<ReturnType<typeof api.bank.browsePublicSheets>>
          )
          setPublicItems([...response.data])
          setTotal(response.total)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memuat bank soal")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [query, tab])

  useEffect(() => {
    loadBank()
  }, [loadBank])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const displayItems = tab === "mine" ? ownItems : publicItems

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

  const handleUseSheet = (item: BankSheetRow) => {
    setUseSheetLoadingId(item.id)
    void api.bank
      .useSheet({ sourceExamId: item.id })
      .then((result) => {
        const response = unwrapApiEither(result)
        void navigate({ to: "/preview", search: { examId: response.examId } })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memakai lembar")
      })
      .finally(() => {
        setUseSheetLoadingId(null)
      })
  }

  const handleTogglePublic = (item: BankSheet) => {
    void api.bank
      .updateSheet(item.id, { isPublic: !item.isPublic })
      .then((result) => {
        const updated = unwrapApiEither(result)
        setOwnItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memperbarui visibilitas lembar")
      })
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Bank Soal"
        subtitle="Lembar ujian yang sudah Final otomatis tersimpan di Bank Saya dan tampil di Bank Publik agar guru lain bisa memakainya utuh."
      />

      <div className="flex flex-wrap gap-2 border-b border-border-default">
        <button
          type="button"
          onClick={() => {
            setTab("mine")
            setPage(1)
          }}
          className={`px-4 py-2 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "mine"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Bank Saya
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("public")
            setPage(1)
          }}
          className={`px-4 py-2 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "public"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Bank Publik
        </button>
      </div>

      {tab === "mine" ? <BankStatsSummary items={ownItems} /> : null}

      <BankToolbar
        search={search}
        subject={subject}
        grade={grade}
        difficulty={difficulty}
        topic={topic}
        type={type}
        author={author}
        sort={sort}
        showAuthorFilter={tab === "public"}
        showTypeFilter={false}
        itemLabel="lembar"
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
            title="Gagal memuat bank soal"
            description={error}
            action={
              <Button variant="primary" size="md" onClick={loadBank}>
                Coba lagi
              </Button>
            }
          />
        ) :
        null}

      {!loading && !error && displayItems.length === 0 ?
        (
          <EmptyState
            icon={<BookOpen size={24} className="text-text-tertiary" />}
            title={tab === "mine" ? "Bank soal masih kosong" : "Belum ada lembar publik"}
            description={tab === "mine"
              ? "Finalisasi ujian dari Review atau Preview. Lembar Final otomatis masuk ke bank."
              : "Lembar Final dari guru lain akan muncul di sini setelah mereka menyelesaikan ujian."}
            action={tab === "mine" ?
              (
                <Button asChild variant="primary" size="md">
                  <Link to="/generate">Generate ujian</Link>
                </Button>
              ) :
              undefined}
          />
        ) :
        null}

      {!loading && !error && displayItems.length > 0 ?
        (
          <>
            <BankSheetTable
              items={displayItems}
              showAuthor={tab === "public"}
              showVisibility={tab === "mine"}
              onPreview={(item) => setPreviewSheet(item)}
              onUseSheet={handleUseSheet}
              {...(tab === "mine" ? { onTogglePublic: handleTogglePublic } : {})}
              useSheetLoadingId={useSheetLoadingId}
            />
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

      <BankSheetPreviewDialog
        examId={previewSheet?.id ?? null}
        {...(previewSheet?.title ? { title: previewSheet.title } : {})}
        open={previewSheet !== null}
        onClose={() => setPreviewSheet(null)}
      />
    </div>
  )
}
