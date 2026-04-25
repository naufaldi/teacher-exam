import { useState } from 'react'
import type { Exam } from '@teacher-exam/shared'
import { Copy, MoreHorizontal, Pencil, PrinterIcon, Trash2, CheckSquare } from 'lucide-react'
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

const COLUMN_TEMPLATE =
  'grid-cols-[2.4fr_1fr_0.7fr_0.6fr] lg:grid-cols-[2.4fr_1fr_0.7fr_0.6fr_0.8fr_1.4fr]'

function HistoryTable({ exams, onDelete, onDuplicate }: HistoryTableProps) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-md overflow-hidden">
      <div
        className={`grid items-center px-5 py-3 bg-kertas-50 border-b border-border-default ${COLUMN_TEMPLATE}`}
      >
        <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
          Lembar
        </span>
        <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
          Mata Pelajaran
        </span>
        <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
          Tanggal
        </span>
        <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary tabular-nums">
          Soal
        </span>
        <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary hidden lg:block">
          Status
        </span>
        <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary hidden lg:block text-right">
          Aksi
        </span>
      </div>

      {exams.map((exam) => (
        <HistoryTableRow
          key={exam.id}
          exam={exam}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
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

  function handlePrint() {
    void navigate({ to: '/preview', search: { examId: exam.id } })
  }

  function handleCorrection() {
    void navigate({ to: '/correction/$examId', params: { examId: exam.id } })
  }

  function handleEdit() {
    void navigate({ to: '/review', search: { examId: exam.id, mode: exam.reviewMode } })
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
      <div
        className={`grid items-center px-5 py-3.5 border-b border-border-default last:border-b-0 hover:bg-kertas-50 transition-colors duration-[120ms] ${COLUMN_TEMPLATE}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-10 border border-kertas-300 rounded-xs bg-bg-surface flex items-center justify-center font-bold text-body-sm shrink-0 ${subj.dotClass}`}
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {subj.short}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-body-sm text-text-primary leading-snug truncate">
              {exam.title}
            </div>
            <div className="text-caption text-text-tertiary mt-0.5 truncate">
              {exam.examType} · {exam.topics.join(', ')}
            </div>
          </div>
        </div>

        <div className="text-body-sm text-text-secondary truncate">
          {subj.label} · K{exam.grade}
        </div>

        <div className="text-body-sm text-text-secondary tabular-nums">
          {formatShortDate(exam.createdAt)}
        </div>

        <div className="text-body-sm text-text-secondary tabular-nums">20</div>

        <div className="hidden lg:block">
          <Badge variant={isFinal ? 'success' : 'warning'}>
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            {isFinal ? 'Final' : 'Draft'}
          </Badge>
        </div>

        <div className="hidden lg:flex justify-end gap-1.5">
          {isFinal ? (
            <>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <PrinterIcon size={13} />
                Cetak
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
          <details className="relative">
            <summary
              className="list-none h-8 w-8 inline-flex items-center justify-center rounded-sm text-text-tertiary hover:bg-kertas-100 hover:text-text-primary cursor-pointer transition-colors duration-[120ms] [&::-webkit-details-marker]:hidden"
              aria-label="Aksi lain"
              role="button"
            >
              <MoreHorizontal size={14} />
            </summary>
            <div className="absolute right-0 top-9 z-10 min-w-[180px] rounded-sm border border-border-default bg-bg-surface shadow-md py-1">
              {isFinal ? (
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-kertas-50 inline-flex items-center gap-2"
                >
                  <Copy size={13} className="text-text-tertiary" />
                  Duplikat sebagai draft
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="w-full text-left px-3 py-2 text-body-sm text-danger-fg hover:bg-danger-bg inline-flex items-center gap-2"
              >
                <Trash2 size={13} />
                Hapus lembar
              </button>
            </div>
          </details>
        </div>
      </div>

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
