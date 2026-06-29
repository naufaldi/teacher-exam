import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import type {
  BankSheet,
  BrowseBankSheetsQuery,
  PublicBankSheet
} from "@teacher-exam/shared"
import { Button, EmptyState, LoadingSpinner, PageHeader } from "@teacher-exam/ui"
import { BookOpen } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BankStatsSummary } from "../components/bank/bank-stats-summary.js"
import {
  type BankDifficultyFilter,
  type BankGradeFilter,
  type BankSortFilter,
  type BankSubjectFilter,
  BankToolbar,
  type BankTab,
  type BankTypeFilter
} from "../components/bank/bank-toolbar.js"
import { HistoryPagination } from "../components/history/history-pagination.js"
import {
  bankSheetToSheetRow,
  SheetPreviewDialog,
  SheetTable,
  useSheetPreview,
  useSheetTableHandlers
} from "../components/sheet/index.js"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/_auth/bank-soal")({
  component: BankSoalPage
})

type BankSheetRow = BankSheet | PublicBankSheet

function BankSoalPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<BankTab>("mine")
  const [ownItems, setOwnItems] = useState<Array<BankSheet>>([])
  const [publicItems, setPublicItems] = useState<Array<PublicBankSheet>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
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
  const sheetPreview = useSheetPreview()
  const [useSheetLoadingId, setUseSheetLoadingId] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)

  const query = useMemo((): BrowseBankSheetsQuery => {
    return {
      page,
      limit: pageSize,
      sort,
      ...(subject ? { subject } : {}),
      ...(grade ? { grade: Number(grade) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      ...(tab === "public" && author.trim() ? { author: author.trim() } : {}),
      ...(search.trim() ? { search: search.trim() } : {})
    }
  }, [subject, grade, difficulty, topic, author, sort, search, page, pageSize, tab])

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
        setInitialLoad(false)
      })
  }, [query, tab])

  useEffect(() => {
    loadBank()
  }, [loadBank])

  const displayItems = tab === "mine" ? ownItems : publicItems
  const displayRows = displayItems.map((item) => bankSheetToSheetRow(item))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

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

  const handleTabChange = (nextTab: BankTab) => {
    setTab(nextTab)
    setPage(1)
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

  const sheetHandlers = useSheetTableHandlers({
    onPreview: sheetPreview.openPreview,
    onDuplicate: () => {},
    onDelete: async () => {},
    onUseSheet: (row) => {
      const item = displayItems.find((i) => i.id === row.id)
      if (item) {
        handleUseSheet(item)
      }
    },
    onTogglePublic: (row) => {
      const item = ownItems.find((i) => i.id === row.id)
      if (item) {
        handleTogglePublic(item)
      }
    }
  })

  if (initialLoad && loading) {
    return <LoadingSpinner message="Memuat bank soal…" />
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Bank Soal"
        subtitle="Lembar ujian yang sudah Final otomatis tersimpan di Bank Saya dan tampil di Bank Publik agar guru lain bisa memakainya utuh."
      />

      {tab === "mine" ? <BankStatsSummary items={ownItems} /> : null}

      <section
        className="space-y-4 animate-fade-up-stagger"
        style={{ "--index": 1 } as React.CSSProperties}
      >
        <BankToolbar
          tab={tab}
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
          onTabChange={handleTabChange}
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
              <SheetTable
                variant={tab === "mine" ? "bank-mine" : "bank-public"}
                rows={displayRows}
                useSheetLoadingId={useSheetLoadingId}
                handlers={sheetHandlers}
              />

              <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
                <span className="text-body-sm text-text-tertiary">
                  Menampilkan{" "}
                  <span className="text-text-primary font-semibold tabular-nums">
                    {displayItems.length}
                  </span>{" "}
                  dari <span className="tabular-nums">{total}</span> lembar yang cocok
                </span>
                <HistoryPagination
                  page={safePage}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPage(1)
                  }}
                />
              </div>
            </>
          ) :
          null}
      </section>

      <SheetPreviewDialog
        examId={sheetPreview.previewExamId}
        {...(sheetPreview.previewTitle ? { title: sheetPreview.previewTitle } : {})}
        open={sheetPreview.previewOpen}
        onClose={sheetPreview.closePreview}
      />
    </div>
  )
}
