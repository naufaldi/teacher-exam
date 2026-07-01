import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { resolveExamSubjectLabel } from "@teacher-exam/shared"
import { CheckSquare, Copy, Eye, Globe, Link2, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { subjectMetaFor } from "../../lib/subjects.js"
import {
  getSheetActions,
  getSheetColumns,
  resolveTitleClickAction,
  showExamTypeInSubtitle
} from "./sheet-table.actions.js"
import type {
  SheetActionDef,
  SheetActionId,
  SheetColumnId,
  SheetTableHandlers,
  SheetTableProps,
  SheetTableRow
} from "./sheet-table.types.js"

const HEAD_CLS = "text-caption font-semibold tracking-wider uppercase text-text-tertiary px-5 py-3 h-auto"

const COLUMN_LABELS: Record<SheetColumnId, string> = {
  lembar: "Lembar",
  subject: "Mata Pelajaran",
  date: "Tanggal",
  soal: "Soal",
  status: "Status",
  visibility: "Visibilitas",
  author: "Penulis",
  actions: "Aksi"
}

const COLUMN_WIDTHS: Partial<Record<SheetColumnId, string>> = {
  lembar: "w-[32%]",
  subject: "w-[14%]",
  date: "w-[11%]",
  soal: "w-[7%]",
  status: "w-[12%]",
  visibility: "w-[12%]",
  author: "w-[12%]",
  actions: "w-[24%]"
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
}

interface IconActionProps {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  disabledTitle?: string
}

function IconAction({ disabled, disabledTitle, icon, label, onClick }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="w-8 px-0 shrink-0"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{disabled && disabledTitle ? disabledTitle : label}</TooltipContent>
    </Tooltip>
  )
}

function actionIcon(id: SheetActionId): ReactNode {
  switch (id) {
    case "preview":
      return <Eye size={13} />
    case "edit":
      return <Pencil size={13} />
    case "duplicate":
    case "duplicate-overflow":
    case "use-sheet":
      return <Copy size={14} />
    case "correction":
      return <CheckSquare size={14} />
    case "share":
      return <Link2 size={14} />
    case "delete":
      return <Trash2 size={13} />
    case "toggle-public":
      return <Globe size={13} />
    case "print":
      return <Eye size={13} />
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

interface SheetTableRowViewProps {
  row: SheetTableRow
  variant: SheetTableProps["variant"]
  readOnly: boolean
  useSheetLoading: boolean
  handlers: SheetTableHandlers
}

function SheetTableRowView({
  handlers,
  readOnly,
  row,
  useSheetLoading,
  variant
}: SheetTableRowViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const subjMeta = row.subject ? subjectMetaFor(row.subject) : null
  const subjLabel = resolveExamSubjectLabel({
    subject: row.subject,
    subjectLabel: row.subjectLabel
  })
  const subjShort = subjMeta?.short ?? (subjLabel.length > 4 ? `${subjLabel.slice(0, 4)}…` : subjLabel)
  const columns = getSheetColumns(variant)
  const actions = getSheetActions(variant, row, { readOnly })
  const isFinal = row.status === "final" || row.source === "bank"
  const subtitle = showExamTypeInSubtitle(variant)
    ? `${row.examType} · ${row.topics.join(", ")}`
    : row.topics.join(", ")

  function runAction(id: SheetActionId) {
    switch (id) {
      case "edit":
        handlers.onEdit(row)
        break
      case "preview":
        handlers.onPreview(row)
        break
      case "print":
        handlers.onPrint(row)
        break
      case "duplicate":
      case "duplicate-overflow":
        handlers.onDuplicate(row)
        break
      case "correction":
        handlers.onCorrection(row)
        break
      case "share":
        if (handlers.onShare) {
          void handlers.onShare(row)
        }
        break
      case "use-sheet":
        if (handlers.onUseSheet) {
          handlers.onUseSheet(row)
        }
        break
      case "toggle-public":
        if (handlers.onTogglePublic) {
          handlers.onTogglePublic(row)
        }
        break
      case "delete":
        setConfirmOpen(true)
        break
      default: {
        const _exhaustive: never = id
        return _exhaustive
      }
    }
  }

  function handleTitleClick() {
    runAction(resolveTitleClickAction(row))
  }

  function renderAction(action: SheetActionDef) {
    if (action.placement === "primary") {
      if (action.id === "use-sheet") {
        return (
          <Button
            key={action.id}
            variant="primary"
            size="sm"
            disabled={useSheetLoading}
            onClick={() => runAction(action.id)}
            className="shrink-0"
          >
            <Copy size={14} className="mr-1.5" aria-hidden />
            {useSheetLoading ? "Memuat…" : action.label}
          </Button>
        )
      }
      return (
        <Button
          key={action.id}
          variant="secondary"
          size="sm"
          onClick={() => runAction(action.id)}
          disabled={action.disabled}
          {...(action.disabled && action.disabledTitle ? { title: action.disabledTitle } : {})}
          className="shrink-0"
        >
          {actionIcon(action.id)}
          <span className="ml-1.5">{action.label}</span>
        </Button>
      )
    }

    if (action.placement === "icon") {
      return (
        <IconAction
          key={action.id}
          label={action.label}
          icon={actionIcon(action.id)}
          onClick={() => runAction(action.id)}
          {...(action.disabled ? { disabled: true } : {})}
          {...(action.disabledTitle ? { disabledTitle: action.disabledTitle } : {})}
        />
      )
    }

    return null
  }

  const primaryActions = actions.filter((a) => a.placement === "primary")
  const iconActions = actions.filter((a) => a.placement === "icon")
  const overflowActions = actions.filter((a) => a.placement === "overflow")
  const hasOverflow = overflowActions.length > 0

  function renderCell(column: SheetColumnId) {
    switch (column) {
      case "lembar":
        return (
          <TableCell key={column} className="px-5 py-3.5 align-middle">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-10 border border-kertas-300 rounded-xs bg-bg-surface flex items-center justify-center font-bold text-body-sm shrink-0 ${subjMeta?.dotClass ?? "text-text-secondary"}`}
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {subjShort}
              </div>
              <div className="min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleTitleClick}
                      className="block w-full text-left font-semibold text-body-sm text-text-primary leading-snug truncate hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xs"
                    >
                      {row.title}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-[420px] whitespace-normal">
                    {row.title}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-caption text-text-tertiary mt-0.5 truncate cursor-default">
                      {subtitle}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    className="max-w-[420px] whitespace-normal"
                  >
                    {subtitle}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TableCell>
        )
      case "subject":
        return (
          <TableCell
            key={column}
            className="px-5 py-3.5 align-middle text-body-sm text-text-secondary truncate"
          >
            {subjLabel} · K{row.grade}
          </TableCell>
        )
      case "date":
        return (
          <TableCell
            key={column}
            className="px-5 py-3.5 align-middle text-body-sm text-text-secondary tabular-nums"
          >
            {formatShortDate(row.date)}
          </TableCell>
        )
      case "soal":
        return (
          <TableCell
            key={column}
            className="px-5 py-3.5 align-middle text-body-sm text-text-secondary tabular-nums"
          >
            {row.questionCount ?? "—"}
          </TableCell>
        )
      case "status":
        return (
          <TableCell key={column} className="hidden lg:table-cell px-5 py-3.5 align-middle text-center">
            <div className="flex items-center justify-center">
              <Badge
                variant={isFinal ? "success" : "warning"}
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
                {isFinal ? "Final" : "Draft"}
              </Badge>
            </div>
          </TableCell>
        )
      case "visibility":
        return (
          <TableCell key={column} className="hidden lg:table-cell px-5 py-3.5 align-middle text-center">
            <div className="flex items-center justify-center">
              <Badge
                variant={row.visibility === "public" ? "success" : "secondary"}
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
                {row.visibility === "public" ?
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
            </div>
          </TableCell>
        )
      case "author":
        return (
          <TableCell
            key={column}
            className="hidden lg:table-cell px-5 py-3.5 align-middle text-body-sm text-text-secondary truncate"
          >
            {row.authorName ?? "—"}
          </TableCell>
        )
      case "actions":
        return (
          <TableCell key={column} className="hidden lg:table-cell px-5 py-3.5 align-middle">
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap min-w-0">
              {primaryActions.map((action) => renderAction(action))}
              {iconActions.map((action) => renderAction(action))}
              {hasOverflow ?
                (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Aksi lain"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-sm text-text-tertiary hover:bg-kertas-100 hover:text-text-primary cursor-pointer transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={6} className="w-auto min-w-[180px] p-1">
                      {overflowActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          role="menuitem"
                          onClick={() => runAction(action.id)}
                          className={`w-full text-left px-3 py-2 text-body-sm rounded-xs inline-flex items-center gap-2 cursor-pointer ${
                            action.id === "delete"
                              ? "text-danger-fg hover:bg-danger-bg"
                              : "text-text-primary hover:bg-kertas-50"
                          }`}
                        >
                          {actionIcon(action.id)}
                          {action.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                ) :
                null}
            </div>
          </TableCell>
        )
      default: {
        const _exhaustive: never = column
        return _exhaustive
      }
    }
  }

  return (
    <>
      <TableRow>
        {columns.map((column) => renderCell(column))}
      </TableRow>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus lembar ini?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Lembar ujian akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="md" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setConfirmOpen(false)
                void handlers.onDelete(row.id)
              }}
            >
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SheetTable({
  handlers,
  readOnly = false,
  rows,
  useSheetLoadingId = null,
  variant
}: SheetTableProps) {
  const columns = getSheetColumns(variant)

  return (
    <TooltipProvider delayDuration={250}>
      <div className="bg-bg-surface border border-border-default rounded-md overflow-hidden [&>div]:overflow-x-auto">
        <Table className="table-fixed min-w-[880px]">
          <TableHeader className="bg-kertas-50">
            <TableRow className="border-b border-border-default hover:bg-kertas-50">
              {columns.map((column) => (
                <TableHead
                  key={column}
                  className={`${HEAD_CLS} ${COLUMN_WIDTHS[column] ?? ""} ${column === "soal" ? "tabular-nums" : ""} ${
                    column === "status" || column === "visibility" ? "hidden lg:table-cell text-center" : ""
                  } ${column === "author" ? "hidden lg:table-cell" : ""} ${
                    column === "actions" ? "hidden lg:table-cell text-right" : ""
                  }`}
                >
                  {COLUMN_LABELS[column]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <SheetTableRowView
                key={row.id}
                row={row}
                variant={variant}
                readOnly={readOnly}
                useSheetLoading={useSheetLoadingId === row.id}
                handlers={handlers}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}

export { formatShortDate, SheetTable }
