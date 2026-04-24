import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  XCircle,
  Pencil,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  PageHeader,
  useToast,
  DatePicker,
} from '@teacher-exam/ui'
import type { ExamType, Question, UpdateExamInput, UpdateQuestionInput } from '@teacher-exam/shared'
import { RegenerateSingleDialog } from '../components/review/regenerate-single-dialog.js'
import { RegenerateBatchDialog } from '../components/review/regenerate-batch-dialog.js'
import { examDraftStore, useExamDraft } from '../lib/exam-draft-store.js'
import { api } from '../lib/api.js'
import { QuestionEditDialog } from '../components/review/question-edit-dialog.js'
import { RejectConfirmDialog } from '../components/review/reject-confirm-dialog.js'
import { RegenerateConfirmDialog } from '../components/review/regenerate-confirm-dialog.js'
import { SwitchModeDialog } from '../components/review/switch-mode-dialog.js'
export const Route = createFileRoute('/_auth/review')({
  component: ReviewPage,
  validateSearch: (search): { mode: 'fast' | 'slow'; from?: 'generate'; examId?: string } => {
    const result: { mode: 'fast' | 'slow'; from?: 'generate'; examId?: string } = {
      mode: (search['mode'] as 'fast' | 'slow') ?? 'fast',
    }
    if (search['from'] === 'generate') result.from = 'generate'
    if (typeof search['examId'] === 'string') result.examId = search['examId']
    return result
  },
  loaderDeps: ({ search }) => ({ examId: search.examId }),
  loader: async ({ deps }) => {
    const { examId } = deps
    if (!examId) throw redirect({ to: '/dashboard' })
    const exam = await api.exams.get(examId)
    examDraftStore.setQuestions([...exam.questions])
    examDraftStore.setReviewMode(exam.reviewMode as 'fast' | 'slow')
    examDraftStore.setConfig({
      subject: exam.subject as 'bahasa_indonesia' | 'pendidikan_pancasila',
      grade: exam.grade,
      topic: exam.topic,
      examType: exam.examType as ExamType,
      classContext: exam.classContext ?? '',
    })
    examDraftStore.setMetadata({
      schoolName: exam.schoolName ?? '',
      academicYear: exam.academicYear ?? '',
      examDate: exam.examDate ?? '',
      durationMinutes: exam.durationMinutes ?? 60,
      instructions: exam.instructions ?? '',
    })
    return exam
  },
})

type QuestionStatus = 'pending' | 'accepted' | 'rejected'

const STATUS_BORDER: Record<QuestionStatus, string> = {
  accepted: 'border-l-success-solid opacity-75',
  rejected: 'border-l-danger-solid',
  pending:  'border-l-border-default',
}

function ReviewPage() {
  const { mode, from, examId } = Route.useSearch()
  const navigate = useNavigate()
  const draft = useExamDraft()
  const { toast } = useToast()

  // Sync URL `mode` into the shared draft once on mount / mode change
  useEffect(() => {
    examDraftStore.setReviewMode(mode)
  }, [mode])

  // Per-question accept/reject state — fast mode always starts accepted; slow mode seeds from server
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>(() =>
    Object.fromEntries(
      draft.questions.map((q) => [
        q.id,
        mode === 'fast' ? 'accepted' : ((q.status as QuestionStatus | undefined) ?? 'pending'),
      ]),
    ),
  )

  // Track which questions have been edited (for dirty-state on switch)
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())

  const [editingId, setEditingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [pendingSwitchTo, setPendingSwitchTo] = useState<'fast' | 'slow' | null>(null)
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const [failedRegenIds, setFailedRegenIds] = useState<Set<string>>(new Set())
  const [regenSingleTargetId, setRegenSingleTargetId] = useState<string | null>(null)
  const [regenSingleDialogOpen, setRegenSingleDialogOpen] = useState(false)
  const [regenBatchDialogOpen, setRegenBatchDialogOpen] = useState(false)

  // Success toast + strip ?from=generate from URL after first render so refresh doesn't re-trigger
  useEffect(() => {
    if (from === 'generate') {
      toast({
        variant: 'success',
        title: 'Lembar berhasil dibuat',
        description: '20 soal berhasil dibuat — siap di-review.',
      })
      void navigate({
        to: '/review',
        search: examId !== undefined ? { mode, examId } : { mode },
        replace: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-sync statuses if questions list shape changes (e.g. after replacement)
  useEffect(() => {
    setQuestionStatuses((prev) => {
      const next = { ...prev }
      for (const q of draft.questions) {
        if (!(q.id in next)) {
          next[q.id] = mode === 'fast' ? 'accepted' : ((q.status as QuestionStatus | undefined) ?? 'pending')
        }
      }
      for (const id of Object.keys(next)) {
        if (!draft.questions.find((q) => q.id === id)) delete next[id]
      }
      return next
    })
  }, [draft.questions, mode])

  const {
    schoolName = '',
    academicYear = '',
    examType,
    examDate = '',
    durationMinutes,
    instructions = '',
  } = draft.metadata

  const persistMetaField = useCallback(async (patch: Partial<UpdateExamInput>) => {
    if (!examId) return
    try {
      await api.exams.patch(examId, patch)
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Gagal menyimpan metadata',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      })
    }
  }, [examId, toast])

  const questions = draft.questions
  const acceptedCount = useMemo(
    () => Object.values(questionStatuses).filter((s) => s === 'accepted').length,
    [questionStatuses],
  )
  const rejectedCount = useMemo(
    () => Object.values(questionStatuses).filter((s) => s === 'rejected').length,
    [questionStatuses],
  )
  const isMetadataComplete = Boolean(schoolName && academicYear && examType && examDate && durationMinutes)
  const canPreview = acceptedCount === questions.length && isMetadataComplete

  const editingQuestion = editingId !== null
    ? questions.find((q) => q.id === editingId) ?? null
    : null

  const rejectingQuestion = rejectingId !== null
    ? questions.find((q) => q.id === rejectingId) ?? null
    : null

  const isDirty =
    editedIds.size > 0 ||
    Object.values(questionStatuses).some((s) => s === 'rejected') ||
    (mode === 'slow' && Object.values(questionStatuses).some((s) => s === 'accepted'))

  const handleSwitchClick = (target: 'fast' | 'slow') => {
    if (isDirty) {
      setPendingSwitchTo(target)
    } else {
      void navigate({ to: '/review', search: { mode: target } })
    }
  }

  const handleSwitchConfirm = () => {
    if (pendingSwitchTo === null) return
    const target = pendingSwitchTo
    setPendingSwitchTo(null)
    void navigate({ to: '/review', search: { mode: target } })
  }

  const handleEditSave = async (updated: Question) => {
    const original = questions.find((q) => q.id === updated.id)
    if (!original) return
    const diffMut: {
      text?: string
      optionA?: string
      optionB?: string
      optionC?: string
      optionD?: string
      correctAnswer?: 'a' | 'b' | 'c' | 'd'
      status?: 'pending' | 'accepted' | 'rejected'
    } = {}
    if (updated.text          !== original.text)          diffMut.text          = updated.text
    if (updated.optionA       !== original.optionA)       diffMut.optionA       = updated.optionA
    if (updated.optionB       !== original.optionB)       diffMut.optionB       = updated.optionB
    if (updated.optionC       !== original.optionC)       diffMut.optionC       = updated.optionC
    if (updated.optionD       !== original.optionD)       diffMut.optionD       = updated.optionD
    if (updated.correctAnswer !== original.correctAnswer) diffMut.correctAnswer = updated.correctAnswer

    // Compute next status based on current UI status (not DB status)
    const currentStatus = questionStatuses[updated.id] ?? 'pending'
    const nextStatus: QuestionStatus =
      currentStatus === 'rejected' ? 'pending' :
      currentStatus === 'pending'  ? 'accepted' :
      'accepted'

    // Only include status in diff if it would change
    if (nextStatus !== currentStatus) {
      diffMut.status = nextStatus
    }

    const diff: UpdateQuestionInput = diffMut
    setEditingId(null)
    if (Object.keys(diff).length === 0) return

    examDraftStore.updateQuestion(updated.id, { ...updated, status: nextStatus })
    setEditedIds((prev) => new Set(prev).add(updated.id))
    if (nextStatus !== currentStatus) {
      setQuestionStatuses((prev) => ({ ...prev, [updated.id]: nextStatus }))
    }
    try {
      const server = await api.questions.patch(updated.id, diff)
      examDraftStore.updateQuestion(server.id, { ...server, status: nextStatus })
      toast({
        variant: 'success',
        title: 'Soal disimpan',
      })
    } catch (err) {
      examDraftStore.updateQuestion(updated.id, original)
      if (nextStatus !== currentStatus) {
        setQuestionStatuses((prev) => ({ ...prev, [updated.id]: currentStatus }))
      }
      toast({
        variant: 'error',
        title: 'Gagal menyimpan perubahan',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      })
    }
  }

  const setStatus = async (id: string, status: 'accepted' | 'rejected') => {
    const prev = questionStatuses[id] ?? 'pending'
    setQuestionStatuses((p) => ({ ...p, [id]: status }))
    try {
      await api.questions.patch(id, { status })
    } catch (err) {
      setQuestionStatuses((p) => ({ ...p, [id]: prev }))
      toast({
        variant: 'error',
        title: status === 'accepted' ? 'Gagal menerima soal' : 'Gagal menolak soal',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      })
    }
  }

  const handleRejectConfirm = async () => {
    if (rejectingId === null) return
    const targetId = rejectingId
    setRejectingId(null)
    await setStatus(targetId, 'rejected')
  }

  const handleRegenerateBatch = async () => {
    const rejectedIds = questions
      .filter((q) => (questionStatuses[q.id] ?? 'pending') === 'rejected')
      .map((q) => q.id)
    if (rejectedIds.length === 0) return

    await Promise.allSettled(rejectedIds.map((id) => handleRegenerateOne(id)))

    const succeeded = rejectedIds.filter((id) => !failedRegenIds.has(id))
    const failedCount = rejectedIds.length - succeeded.length
    if (failedCount > 0) {
      toast({
        variant: 'error',
        title: `Berhasil ${succeeded.length} · Gagal ${failedCount}`,
        description: 'Soal yang gagal perlu dicoba ulang satu per satu.',
      })
    } else {
      toast({
        variant: 'success',
        title: `${succeeded.length} soal berhasil diganti`,
      })
    }
  }

  const handleRegenerateOne = async (id: string, hint?: string) => {
    setRegeneratingIds((prev) => new Set(prev).add(id))
    try {
      const server = await api.questions.regenerate(id, hint !== undefined ? { hint } : {})
      examDraftStore.updateQuestion(id, server)
      setQuestionStatuses((prev) => ({ ...prev, [id]: 'pending' }))
      setFailedRegenIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    } catch {
      setFailedRegenIds((prev) => new Set(prev).add(id))
    } finally {
      setRegeneratingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const handleTerimaSemuaClick = async () => {
    const pending = questions.filter((q) => (questionStatuses[q.id] ?? 'pending') !== 'accepted')
    if (pending.length === 0) return
    const prevStatuses = Object.fromEntries(
      pending.map((q) => [q.id, questionStatuses[q.id] ?? 'pending'] as const),
    )
    setQuestionStatuses((p) => ({
      ...p,
      ...Object.fromEntries(pending.map((q) => [q.id, 'accepted' as const])),
    }))
    const results = await Promise.allSettled(
      pending.map((q) => api.questions.patch(q.id, { status: 'accepted' })),
    )
    const failedIds = pending
      .filter((_, i) => results[i]?.status === 'rejected')
      .map((q) => q.id)
    if (failedIds.length > 0) {
      setQuestionStatuses((p) => ({
        ...p,
        ...Object.fromEntries(failedIds.map((id) => [id, prevStatuses[id] ?? 'pending'] as const)),
      }))
      toast({
        variant: 'error',
        title: `Gagal menerima ${failedIds.length} soal`,
        description: 'Sebagian soal perlu dicoba ulang.',
      })
    }
  }

  const [finalizing, setFinalizing] = useState(false)

  const handlePreviewClick = async () => {
    if (!examId) return
    setFinalizing(true)
    try {
      if (mode === 'fast') {
        const toSync = draft.questions.filter((q) => (q.status as string) !== 'accepted')
        if (toSync.length > 0) {
          await Promise.allSettled(
            toSync.map((q) => api.questions.patch(q.id, { status: 'accepted' })),
          )
        }
      }
      await api.exams.finalize(examId)
      void navigate({ to: '/preview', search: { examId } })
    } catch (err) {
      const code = err != null && typeof err === 'object' && 'code' in err
        ? (err as { code?: string }).code
        : undefined
      let description = 'Coba lagi.'
      if (err instanceof Error) description = err.message
      if (code === 'FINALIZE_NOT_ALLOWED') description = 'Semua soal harus diterima sebelum finalisasi.'
      toast({ variant: 'error', title: 'Gagal finalisasi', description })
    } finally {
      setFinalizing(false)
    }
  }

  const handleRegenerateConfirm = () => {
    setShowRegenConfirm(false)
    examDraftStore.reset()
    void navigate({ to: '/generate' })
  }

  return (
    <div className="space-y-6">
      {mode === 'fast' ? (
        <PageHeader
          title="Konfirmasi Paket"
          subtitle="20 soal auto-diterima"
          onBack={() => { void navigate({ to: '/generate' }) }}
        >
          <Badge variant="secondary">Mode Cepat</Badge>
        </PageHeader>
      ) : (
        <PageHeader
          title={`Review (${questions.length} soal)`}
          onBack={() => { void navigate({ to: '/generate' }) }}
        >
          <Badge variant="secondary">{acceptedCount} dari {questions.length} siap</Badge>
        </PageHeader>
      )}

      {mode === 'fast' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-body-sm text-text-secondary">
              {questions.length} soal auto-diterima
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSwitchClick('slow')}
            >
              Switch ke Review Detail
            </Button>
          </div>

          <div className="max-h-[480px] overflow-y-auto rounded-sm border border-border-default divide-y divide-border-default">
            {questions.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-kertas-50 transition-colors"
              >
                <span className="text-caption text-text-tertiary font-mono w-6 shrink-0">
                  {q.number}.
                </span>
                <p className="flex-1 text-body-sm text-text-primary truncate">
                  {q.text.split('\n')[0]}
                </p>
                <span className="font-mono text-caption bg-bg-muted px-1.5 py-0.5 rounded-xs shrink-0">
                  {q.correctAnswer.toUpperCase()}
                </span>
                {q.topic && (
                  <Badge variant="secondary" className="text-caption shrink-0">
                    {q.topic.split(' ')[0]}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => setEditingId(q.id)}
                  className="p-1 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
                  aria-label={`Edit cepat soal ${q.number}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'slow' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { void handleTerimaSemuaClick() }}
            >
              Terima Semua
            </Button>
            {rejectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRegenBatchDialogOpen(true)}
              >
                Ganti semua ditolak ({rejectedCount})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSwitchClick('fast')}
              className="ml-auto"
            >
              Switch ke Mode Cepat
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q) => {
              const status = questionStatuses[q.id] ?? 'pending'
              return (
                <Card
                  key={q.id}
                  className={`relative border-l-4 transition-colors ${STATUS_BORDER[status]}`}
                >
                  <CardContent className="p-4">
                    {regeneratingIds.has(q.id) ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-kertas-200 rounded w-3/4" />
                        <div className="h-4 bg-kertas-200 rounded w-full" />
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          {[0,1,2,3].map(i => <div key={i} className="h-8 bg-kertas-100 rounded" />)}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-mono text-caption text-text-tertiary">{q.number}.</span>
                          {q.difficulty && (
                            <Badge variant="secondary" className="text-caption">
                              {q.difficulty}
                            </Badge>
                          )}
                          {q.topic && (
                            <span className="text-caption text-text-tertiary">{q.topic}</span>
                          )}
                          {editedIds.has(q.id) && (
                            <Badge variant="secondary" className="text-caption">
                              Diedit
                            </Badge>
                          )}
                          {status === 'rejected' && (
                            <span className="ml-auto text-caption text-danger-fg">Perlu diganti</span>
                          )}
                          {status === 'accepted' && (
                            <span className="ml-auto text-caption text-success-fg flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Diterima
                            </span>
                          )}
                        </div>
                        <p className="text-body text-text-primary mb-3 whitespace-pre-line">{q.text}</p>
                        <div className="grid grid-cols-2 gap-1 mb-4">
                          {(['a', 'b', 'c', 'd'] as const).map((letter) => (
                            <div
                              key={letter}
                              className={`text-body-sm px-3 py-1.5 rounded-xs flex gap-2 ${
                                q.correctAnswer === letter
                                  ? 'bg-success-bg text-success-fg font-medium'
                                  : 'text-text-secondary'
                              }`}
                            >
                              <span className="font-mono text-caption shrink-0">
                                {letter.toUpperCase()}.
                              </span>
                              <span>
                                {q[`option${letter.toUpperCase() as 'A' | 'B' | 'C' | 'D'}`]}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-success-fg border-success-border"
                            onClick={() => { void setStatus(q.id, 'accepted') }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Terima
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(q.id)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger-fg hover:text-danger-fg"
                            onClick={() => setRejectingId(q.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Tolak
                          </Button>
                          {status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRegenSingleTargetId(q.id)
                                setRegenSingleDialogOpen(true)
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Ganti dengan AI
                            </Button>
                          )}
                          {failedRegenIds.has(q.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRegenSingleTargetId(q.id)
                                setRegenSingleDialogOpen(true)
                              }}
                            >
                              Coba lagi
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-5">
        <h3 className="text-h3 font-semibold text-text-primary">Detail Lembar Ujian</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="sekolah">Nama Sekolah</Label>
            <Input
              id="sekolah"
              value={schoolName}
              onChange={(e) => examDraftStore.setMetadata({ schoolName: e.target.value })}
              onBlur={(e) => { void persistMetaField({ schoolName: e.target.value }) }}
              placeholder="SD Negeri ..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tahun">Tahun Pelajaran</Label>
            <Input
              id="tahun"
              value={academicYear}
              onChange={(e) => examDraftStore.setMetadata({ academicYear: e.target.value })}
              onBlur={(e) => { void persistMetaField({ academicYear: e.target.value }) }}
              placeholder="2025/2026"
            />
          </div>
          {/* PRD §8.6 */}
          <div className="space-y-1.5">
            <Label htmlFor="jenis">Jenis Ujian</Label>
            <Select
              value={examType}
              onValueChange={(v) => {
                const next = v as ExamType
                examDraftStore.setMetadata({ examType: next })
                void persistMetaField({ examType: next })
              }}
            >
              <SelectTrigger id="jenis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latihan">Latihan Soal</SelectItem>
                <SelectItem value="formatif">Ulangan Harian</SelectItem>
                <SelectItem value="sts">UTS · Sumatif Tengah Semester</SelectItem>
                <SelectItem value="sas">UAS · Sumatif Akhir Semester</SelectItem>
                <SelectItem value="tka">TKA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tanggal">Tanggal Ujian</Label>
            <DatePicker
              id="tanggal"
              value={examDate}
              onChange={(iso) => examDraftStore.setMetadata({ examDate: iso })}
              onCommit={(iso) => { void persistMetaField({ examDate: iso }) }}
              placeholder="Pilih tanggal ujian"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durasi">Durasi (menit)</Label>
            <Input
              id="durasi"
              value={String(durationMinutes)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') { examDraftStore.setMetadata({ durationMinutes: 0 }); return }
                const n = parseInt(raw, 10)
                if (!Number.isNaN(n)) examDraftStore.setMetadata({ durationMinutes: n })
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val)) { void persistMetaField({ durationMinutes: val }) }
              }}
              placeholder="60"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="petunjuk">Petunjuk Pengerjaan</Label>
          <Textarea
            id="petunjuk"
            value={instructions}
            onChange={(e) => examDraftStore.setMetadata({ instructions: e.target.value })}
            onBlur={(e) => { void persistMetaField({ instructions: e.target.value }) }}
            rows={4}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-default">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowRegenConfirm(true)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
          </Button>
        </div>
        <Button
          disabled={!canPreview || finalizing}
          onClick={() => { void handlePreviewClick() }}
        >
          {finalizing ? 'Menyimpan...' : 'Preview Lembar'}<ChevronRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>

      <QuestionEditDialog
        open={editingId !== null}
        question={editingQuestion}
        onClose={() => setEditingId(null)}
        onSave={(updated) => { void handleEditSave(updated) }}
      />
      <RejectConfirmDialog
        open={rejectingId !== null}
        questionNumber={rejectingQuestion?.number ?? null}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectingId(null)}
      />
      <RegenerateConfirmDialog
        open={showRegenConfirm}
        acceptedCount={acceptedCount + editedIds.size}
        onConfirm={handleRegenerateConfirm}
        onClose={() => setShowRegenConfirm(false)}
      />
      <SwitchModeDialog
        open={pendingSwitchTo !== null}
        targetMode={pendingSwitchTo ?? 'fast'}
        onConfirm={handleSwitchConfirm}
        onClose={() => setPendingSwitchTo(null)}
      />
      <RegenerateSingleDialog
        open={regenSingleDialogOpen}
        onOpenChange={(v) => {
          setRegenSingleDialogOpen(v)
          if (!v) setRegenSingleTargetId(null)
        }}
        onConfirm={(hint) => {
          setRegenSingleDialogOpen(false)
          if (regenSingleTargetId !== null) {
            void handleRegenerateOne(regenSingleTargetId, hint)
          }
          setRegenSingleTargetId(null)
        }}
      />
      <RegenerateBatchDialog
        open={regenBatchDialogOpen}
        onOpenChange={setRegenBatchDialogOpen}
        count={rejectedCount}
        onConfirm={() => { void handleRegenerateBatch() }}
      />
    </div>
  )
}
