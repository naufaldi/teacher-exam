import type { Exam } from '@teacher-exam/shared'
import { MoreHorizontal } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Badge, Button } from '@teacher-exam/ui'

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

interface ExamHistoryRowProps {
  exam: Exam
  onDuplicate?: (exam: Exam) => void
}

function ExamHistoryRow({ exam, onDuplicate }: ExamHistoryRowProps) {
  const navigate = useNavigate()
  const subj = SUBJECT_MAP[exam.subject] ?? FALLBACK_SUBJECT
  const isFinal = exam.status === 'final'

  function handleEdit() {
    void navigate({
      to: '/review',
      search: { examId: exam.id, mode: exam.reviewMode },
    })
  }

  function handlePrint() {
    void navigate({ to: '/preview', search: { examId: exam.id } })
  }

  function handleCorrect() {
    void navigate({ to: '/correction/$examId', params: { examId: exam.id } })
  }

  function handleDuplicate() {
    if (onDuplicate) {
      onDuplicate(exam)
    }
  }

  return (
    <div className="grid items-center px-5 py-3.5 border-b border-border-default last:border-b-0 hover:bg-kertas-50 transition-colors duration-[120ms] grid-cols-[2.4fr_1fr_0.8fr] lg:grid-cols-[2.4fr_1fr_0.8fr_0.9fr_1.2fr]">
      {/* Title cell */}
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
          <div className="text-caption text-text-tertiary mt-0.5">
            {exam.topics.join(', ')}
          </div>
        </div>
      </div>

      {/* Subject cell */}
      <div className="text-body-sm text-text-secondary truncate">
        {subj.label} · K{exam.grade}
      </div>

      {/* Date cell */}
      <div className="text-body-sm text-text-secondary tabular-nums">
        {formatShortDate(exam.createdAt)}
      </div>

      {/* Status cell — hidden on mobile */}
      <div className="hidden lg:block">
        <Badge variant={isFinal ? 'success' : 'warning'}>
          {isFinal ? 'Final' : 'Draft'}
        </Badge>
      </div>

      {/* Actions cell — hidden on mobile */}
      <div className="hidden lg:flex justify-end gap-1.5">
        {isFinal ? (
          <>
            <Button variant="secondary" size="sm" onClick={handlePrint}>Cetak</Button>
            <Button variant="secondary" size="sm" onClick={handleCorrect}>Koreksi</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={handleEdit}>Edit</Button>
            <Button variant="secondary" size="sm" onClick={handleDuplicate}>Duplikat</Button>
          </>
        )}
        <Button variant="ghost" size="icon" aria-label="Aksi lain">
          <MoreHorizontal size={14} />
        </Button>
      </div>
    </div>
  )
}

export { ExamHistoryRow }
