import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@teacher-exam/ui'

interface HistoryPaginationProps {
  page: number
  pageSize: number
  totalItems: number
  pageSizeOptions?: ReadonlyArray<number>
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function getPageNumbers(page: number, totalPages: number): Array<number | '...'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  if (page <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages]
  }
  if (page >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  return [1, '...', page - 1, page, page + 1, '...', totalPages]
}

const DEFAULT_PAGE_SIZE_OPTIONS: ReadonlyArray<number> = [8, 16, 32]

function HistoryPagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
}: HistoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center gap-4 flex-wrap justify-end">
      <div className="flex items-center gap-2 text-body-sm text-text-secondary">
        <label htmlFor="page-size" className="shrink-0">
          Per halaman
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-sm border border-border-default bg-bg-surface px-2 text-body-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Sebelumnya"
        >
          <ChevronLeft size={14} />
          Sebelumnya
        </Button>

        {pageNumbers.map((n, i) =>
          n === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="w-8 h-8 inline-flex items-center justify-center text-text-tertiary text-body-sm select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={n}
              variant={n === page ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(n)}
              aria-label={String(n)}
              aria-current={n === page ? 'page' : undefined}
              className="w-8 px-0"
            >
              {n}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Berikutnya"
        >
          Berikutnya
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}

export { HistoryPagination }
