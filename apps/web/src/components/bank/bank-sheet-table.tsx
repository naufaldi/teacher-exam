import type { BankSheet, PublicBankSheet } from "@teacher-exam/shared"
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@teacher-exam/ui"
import { Copy, Eye, Globe, Lock } from "lucide-react"
import { subjectMetaFor } from "../../lib/subjects.js"

const HEAD_CLS = "text-caption font-semibold tracking-wider uppercase text-text-tertiary px-5 py-3 h-auto"

type BankSheetRow = BankSheet | PublicBankSheet

function isPublicBankSheet(item: BankSheetRow): item is PublicBankSheet {
  return "authorName" in item
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
}

interface BankSheetTableProps {
  items: ReadonlyArray<BankSheetRow>
  showAuthor?: boolean
  showVisibility?: boolean
  readOnly?: boolean
  onPreview: (item: BankSheetRow) => void
  onUseSheet: (item: BankSheetRow) => void
  onTogglePublic?: (item: BankSheet) => void
  useSheetLoadingId?: string | null
}

function BankSheetTable({
  items,
  onPreview,
  onTogglePublic,
  onUseSheet,
  readOnly = false,
  showAuthor = false,
  showVisibility = false,
  useSheetLoadingId = null
}: BankSheetTableProps) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="bg-bg-surface border border-border-default rounded-md overflow-hidden [&>div]:overflow-x-auto">
        <Table className="table-fixed min-w-[880px]">
          <TableHeader className="bg-kertas-50">
            <TableRow className="border-b border-border-default hover:bg-kertas-50">
              <TableHead className={`${HEAD_CLS} w-[32%]`}>Lembar</TableHead>
              <TableHead className={`${HEAD_CLS} w-[14%]`}>Mata Pelajaran</TableHead>
              <TableHead className={`${HEAD_CLS} w-[11%]`}>Tanggal</TableHead>
              <TableHead className={`${HEAD_CLS} w-[7%] tabular-nums`}>Soal</TableHead>
              {showVisibility ?
                (
                  <TableHead className={`${HEAD_CLS} hidden lg:table-cell w-[10%] text-center`}>
                    Visibilitas
                  </TableHead>
                ) :
                null}
              {showAuthor ?
                (
                  <TableHead className={`${HEAD_CLS} hidden lg:table-cell w-[12%]`}>Penulis</TableHead>
                ) :
                null}
              <TableHead className={`${HEAD_CLS} hidden lg:table-cell w-[24%] text-right`}>
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const subj = subjectMetaFor(item.subject)
              const loading = useSheetLoadingId === item.id
              return (
                <TableRow key={item.id}>
                  <TableCell className="px-5 py-3.5 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-10 border border-kertas-300 rounded-xs bg-bg-surface flex items-center justify-center font-bold text-body-sm shrink-0 ${subj.dotClass}`}
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {subj.short}
                      </div>
                      <div className="min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onPreview(item)}
                              className="block w-full text-left font-semibold text-body-sm text-text-primary leading-snug truncate hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xs"
                            >
                              {item.title}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-[420px] whitespace-normal">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-caption text-text-tertiary mt-0.5 truncate">
                          {item.examType} · {item.topics.join(", ")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 align-middle text-body-sm text-text-secondary truncate">
                    {subj.label} · K{item.grade}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 align-middle text-body-sm text-text-secondary tabular-nums">
                    {formatShortDate(item.bankedAt)}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 align-middle text-body-sm text-text-secondary tabular-nums">
                    {item.questionCount}
                  </TableCell>
                  {showVisibility && !isPublicBankSheet(item) ?
                    (
                      <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle text-center">
                        <Badge
                          variant={item.isPublic ? "success" : "secondary"}
                          className="inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          {item.isPublic ?
                            (
                              <>
                                <Globe size={12} aria-hidden />
                                Publik
                              </>
                            ) :
                            (
                              <>
                                <Lock size={12} aria-hidden />
                                Privat
                              </>
                            )}
                        </Badge>
                      </TableCell>
                    ) :
                    showVisibility ?
                    (
                      <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle text-center">
                        <Badge variant="success" className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Globe size={12} aria-hidden />
                          Publik
                        </Badge>
                      </TableCell>
                    ) :
                    null}
                  {showAuthor && isPublicBankSheet(item) ?
                    (
                      <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle text-body-sm text-text-secondary truncate">
                        {item.authorName}
                      </TableCell>
                    ) :
                    showAuthor ?
                    (
                      <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle text-body-sm text-text-secondary">
                        —
                      </TableCell>
                    ) :
                    null}
                  <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onPreview(item)}>
                        <Eye size={14} className="mr-1.5" aria-hidden />
                        Pratinjau
                      </Button>
                      {!readOnly ?
                        (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={loading}
                            onClick={() => onUseSheet(item)}
                          >
                            <Copy size={14} className="mr-1.5" aria-hidden />
                            {loading ? "Memuat…" : "Pakai lembar"}
                          </Button>
                        ) :
                        null}
                      {showVisibility && !isPublicBankSheet(item) && onTogglePublic ?
                        (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onTogglePublic(item)}
                          >
                            {item.isPublic ? "Jadikan privat" : "Jadikan publik"}
                          </Button>
                        ) :
                        null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}

export { BankSheetTable }
