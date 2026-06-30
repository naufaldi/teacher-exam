import type { PdfUploadId, PdfUploadSummary } from "@teacher-exam/shared"
import { Badge, Button } from "@teacher-exam/ui"
import { FileText, Loader2, Trash2 } from "lucide-react"
import { useCallback } from "react"

export interface PdfLibraryPickerProps {
  items: ReadonlyArray<PdfUploadSummary>
  loading: boolean
  selectedId: PdfUploadId | null
  onSelect: (item: PdfUploadSummary) => void
  onDelete: (id: PdfUploadId) => void
}

export function PdfLibraryPicker({
  items,
  loading,
  onDelete,
  onSelect,
  selectedId
}: PdfLibraryPickerProps) {
  const handleDelete = useCallback(
    (event: React.MouseEvent, id: PdfUploadId) => {
      event.stopPropagation()
      onDelete(id)
    },
    [onDelete]
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat perpustakaan PDF…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-secondary py-2">
        Belum ada PDF di perpustakaan. Upload file baru untuk memulai.
      </p>
    )
  }

  return (
    <ul className="space-y-2 max-h-48 overflow-y-auto">
      {items.map((item) => {
        const isReady = item.status === "ready"
        const isSelected = selectedId === item.id
        const statusLabel = item.status === "processing" || item.status === "uploaded"
          ? "Sedang diproses"
          : item.status === "failed"
          ? "Gagal"
          : "Siap"

        return (
          <li
            key={item.id}
            className={[
              "flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors",
              isSelected ? "border-accent-primary bg-kertas-100" : "border-border-ui",
              !isReady ? "opacity-60" : ""
            ].join(" ")}
          >
            <button
              type="button"
              disabled={!isReady}
              onClick={() => onSelect(item)}
              className={[
                "flex flex-1 min-w-0 items-center gap-3 text-left",
                !isReady ? "cursor-not-allowed" : "cursor-pointer hover:opacity-90"
              ].join(" ")}
            >
              <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
              <span className="flex-1 truncate font-medium text-text-primary">{item.filename}</span>
              <Badge variant={isReady ? "default" : "secondary"}>{statusLabel}</Badge>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(event) => handleDelete(event, item.id)}
              aria-label={`Hapus ${item.filename}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
