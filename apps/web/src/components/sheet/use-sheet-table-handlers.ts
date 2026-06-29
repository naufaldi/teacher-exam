import { useNavigate } from "@tanstack/react-router"
import type { SheetTableHandlers, SheetTableRow } from "./sheet-table.types.js"

function useSheetTableHandlers(handlers: {
  onPreview: (row: SheetTableRow) => void
  onDuplicate: (row: SheetTableRow) => void
  onDelete: (id: string) => Promise<void>
  onShare?: (row: SheetTableRow) => void | Promise<void>
  onUseSheet?: (row: SheetTableRow) => void
  onTogglePublic?: (row: SheetTableRow) => void
}): SheetTableHandlers {
  const navigate = useNavigate()

  return {
    onPreview: handlers.onPreview,
    onEdit: (row) => {
      void navigate({
        to: "/review",
        search: {
          examId: row.id,
          mode: row.reviewMode ?? "fast"
        }
      })
    },
    onPrint: (row) => {
      void navigate({ to: "/preview", search: { examId: row.id } })
    },
    onDuplicate: handlers.onDuplicate,
    onDelete: handlers.onDelete,
    onCorrection: (row) => {
      void navigate({ to: "/correction/$examId", params: { examId: row.id } })
    },
    ...(handlers.onShare ? { onShare: handlers.onShare } : {}),
    ...(handlers.onUseSheet ? { onUseSheet: handlers.onUseSheet } : {}),
    ...(handlers.onTogglePublic ? { onTogglePublic: handlers.onTogglePublic } : {})
  }
}

export { useSheetTableHandlers }
