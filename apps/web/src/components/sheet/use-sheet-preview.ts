import { useState } from "react"
import type { SheetTableRow } from "./sheet-table.types.js"

type SheetPreviewState = {
  examId: string
  title: string
}

function useSheetPreview() {
  const [preview, setPreview] = useState<SheetPreviewState | null>(null)

  function openPreview(row: SheetTableRow) {
    setPreview({ examId: row.id, title: row.title })
  }

  function closePreview() {
    setPreview(null)
  }

  return {
    previewExamId: preview?.examId ?? null,
    previewTitle: preview?.title,
    previewOpen: preview !== null,
    openPreview,
    closePreview
  }
}

export { useSheetPreview }
export type { SheetPreviewState }
