import type { ExamSubject, ReviewMode } from "@teacher-exam/shared"

type SheetTableVariant = "dashboard-recent" | "history" | "bank-mine" | "bank-public"

type SheetTableRowSource = "exam" | "bank"

type SheetTableRow = {
  id: string
  title: string
  subject: ExamSubject
  grade: number
  topics: ReadonlyArray<string>
  examType: string
  date: string
  questionCount: number | null
  status?: "draft" | "final"
  visibility?: "public" | "private"
  authorName?: string
  reviewMode?: ReviewMode
  source: SheetTableRowSource
}

type SheetColumnId =
  | "lembar"
  | "subject"
  | "date"
  | "soal"
  | "status"
  | "visibility"
  | "author"
  | "actions"

type SheetActionId =
  | "edit"
  | "preview"
  | "print"
  | "duplicate"
  | "duplicate-overflow"
  | "correction"
  | "share"
  | "use-sheet"
  | "toggle-public"
  | "delete"

type SheetActionPlacement = "primary" | "icon" | "overflow"

type SheetActionDef = {
  id: SheetActionId
  placement: SheetActionPlacement
  label: string
  disabled?: boolean
  disabledTitle?: string
}

interface SheetTableHandlers {
  onPreview: (row: SheetTableRow) => void
  onEdit: (row: SheetTableRow) => void
  onPrint: (row: SheetTableRow) => void
  onDuplicate: (row: SheetTableRow) => void
  onDelete: (id: string) => Promise<void>
  onCorrection: (row: SheetTableRow) => void
  onShare?: (row: SheetTableRow) => void | Promise<void>
  onUseSheet?: (row: SheetTableRow) => void
  onTogglePublic?: (row: SheetTableRow) => void
}

interface SheetTableProps {
  variant: SheetTableVariant
  rows: ReadonlyArray<SheetTableRow>
  readOnly?: boolean
  useSheetLoadingId?: string | null
  handlers: SheetTableHandlers
}

export type {
  SheetActionDef,
  SheetActionId,
  SheetColumnId,
  SheetTableHandlers,
  SheetTableProps,
  SheetTableRow,
  SheetTableRowSource,
  SheetTableVariant
}
