import { useState } from 'react'
import type { Exam } from '@teacher-exam/shared'
import { Copy, Eye, MoreHorizontal, Pencil, Trash2, CheckSquare } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  TooltipTrigger,
} from '@teacher-exam/ui'
import { KOREKSI_DISABLED_TITLE, KOREKSI_ENABLED } from '../../lib/feature-flags'

interface SubjectMeta {
  short: string
  label: string
  dotClass: string
}

const SUBJECT_MAP: Record<string, SubjectMeta> = {
  bahasa_indonesia: {
    short: 'BI',
    label: 'Bahasa Indonesia',
    dotClass: 'text-subject-bi',
  },
  pendidikan_pancasila: {
    short: 'PP',
    label: 'Pendidikan Pancasila',
    dotClass: 'text-subject-ppkn',
  },
}

const FALLBACK_SUBJECT: SubjectMeta = {
  short: '?',
  label: 'Mata Pelajaran',
  dotClass: 'text-text-tertiary',
}

const HEAD_CLS = 'text-caption font-semibold tracking-wider uppercase text-text-tertiary px-5 py-3 h-auto'

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface HistoryTableProps {
  exams: ReadonlyArray<Exam>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (exam: Exam) => void
}

function HistoryTable({ exams, onDelete, onDuplicate }: HistoryTableProps) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="bg-bg-surface border border-border-default rounded-md overflow-hidden [&>div]:overflow-hidden">
        <Table className="table-fixed">
          <TableHeader className="bg-kertas-50">
            <TableRow className="border-b border-border-default hover:bg-kertas-50">
              <TableHead className={`${HEAD_CLS} w-[34%]`}>Lembar</TableHead>
              <TableHead className={`${HEAD_CLS} w-[14%]`}>Mata Pelajaran</TableHead>
              <TableHead className={`${HEAD_CLS} w-[10%]`}>Tanggal</TableHead>
              <TableHead className={`${HEAD_CLS} w-[8%] tabular-nums`}>Soal</TableHead>
              <TableHead className={`${HEAD_CLS} hidden lg:table-cell w-[12%] text-center`}>
                Status
              </TableHead>
              <TableHead className={`${HEAD_CLS} hidden lg:table-cell w-[22%] text-center`}>
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <HistoryTableRow
                key={exam.id}
                exam={exam}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}

interface HistoryTableRowProps {
  exam: Exam
  onDelete: (id: string) => Promise<void>
  onDuplicate: (exam: Exam) => void
}

function HistoryTableRow({ exam, onDelete, onDuplicate }: HistoryTableRowProps) {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const subj = SUBJECT_MAP[exam.subject] ?? FALLBACK_SUBJECT
  const isFinal = exam.status === 'final'

  function handlePreview() {
    void navigate({ to: '/preview', search: { examId: exam.id } })
  }

  function handleCorrection() {
    void navigate({ to: '/correction/$examId', params: { examId: exam.id } })
  }

  function handleEdit() {
    void navigate({ to: '/review', search: { examId: exam.id, mode: exam.reviewMode } })
  }

  function handleOpenExam() {
    if (isFinal) {
      handlePreview()
      return
    }
    handleEdit()
  }

  function handleDuplicate() {
    onDuplicate(exam)
  }

  function handleDeleteConfirm() {
    setConfirmOpen(false)
    void onDelete(exam.id)
  }

  return (
    <>
      <TableRow>
        {/* Lembar column */}
        <TableCell className="px-5 py-3.5 align-middle">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-10 border border-kertas-300 rounded-xs bg-bg-surface flex items-center justify-center font-bold text-body-sm shrink-0 ${subj.dotClass}`}
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {subj.short}
            </div>
            <div className="min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleOpenExam}
                    className="block w-full text-left font-semibold text-body-sm text-text-primary leading-snug truncate hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xs"
                  >
                    {exam.title}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-[420px] whitespace-normal">
                  {exam.title}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-caption text-text-tertiary mt-0.5 truncate cursor-default">
                    {exam.examType} · {exam.topics.join(', ')}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="max-w-[420px] whitespace-normal"
                >
                  {exam.examType} · {exam.topics.join(', ')}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TableCell>

        {/* Mata Pelajaran column */}
        <TableCell className="px-5 py-3.5 align-middle text-body-sm text-text-secondary truncate">
          {subj.label} · K{exam.grade}
        </TableCell>

        {/* Tanggal column */}
        <TableCell className="px-5 py-3.5 align-middle text-body-sm text-text-secondary tabular-nums">
          {formatShortDate(exam.createdAt)}
        </TableCell>

        {/* Soal column */}
        <TableCell className="px-5 py-3.5 align-middle text-body-sm text-text-secondary tabular-nums">
          20
        </TableCell>

        {/* Status column */}
        <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle text-center">
          <div className="flex items-center justify-center">
            <Badge
              variant={isFinal ? 'success' : 'warning'}
              className="inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
              {isFinal ? 'Final' : 'Draft'}
            </Badge>
          </div>
        </TableCell>

        {/* Aksi column */}
        <TableCell className="hidden lg:table-cell px-5 py-3.5 align-middle">
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            {isFinal ? (
              <>
                <Button variant="secondary" size="sm" onClick={handlePreview}>
                  <Eye size={13} />
                  Preview
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCorrection}
                  disabled={!KOREKSI_ENABLED}
                  title={KOREKSI_ENABLED ? undefined : KOREKSI_DISABLED_TITLE}
                >
                  <CheckSquare size={13} />
                  Koreksi
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={handleEdit}>
                  <Pencil size={13} />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDuplicate}>
                  <Copy size={13} />
                  Duplikat
                </Button>
              </>
            )}
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
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-auto min-w-[180px] p-1"
              >
                {isFinal ? (
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-kertas-50 rounded-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Copy size={13} className="text-text-tertiary" />
                    Duplikat sebagai draft
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="w-full text-left px-3 py-2 text-body-sm text-danger-fg hover:bg-danger-bg rounded-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 size={13} />
                  Hapus lembar
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </TableCell>
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
            <Button variant="danger" size="md" onClick={handleDeleteConfirm}>
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { HistoryTable }
