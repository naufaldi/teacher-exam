import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  XCircle,
  Pencil,
  RefreshCw,
  ChevronRight,
  Loader2,
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
} from '@teacher-exam/ui'
import type { Question } from '@teacher-exam/shared'
import { examDraftStore, useExamDraft } from '../lib/exam-draft-store.js'
import { QuestionEditDialog } from '../components/review/question-edit-dialog.js'
import { RejectConfirmDialog } from '../components/review/reject-confirm-dialog.js'
import { RegenerateConfirmDialog } from '../components/review/regenerate-confirm-dialog.js'
import { SwitchModeDialog } from '../components/review/switch-mode-dialog.js'
export const Route = createFileRoute('/_auth/review')({
  component: ReviewPage,
  validateSearch: (search): { mode: 'fast' | 'slow'; from?: 'generate' } => {
    const result: { mode: 'fast' | 'slow'; from?: 'generate' } = {
      mode: (search['mode'] as 'fast' | 'slow') ?? 'fast',
    }
    if (search['from'] === 'generate') result.from = 'generate'
    return result
  },
})

type QuestionStatus = 'pending' | 'accepted' | 'rejected'

const REPLACEMENT_TEMPLATES: Array<Omit<Question, 'id' | 'examId' | 'number' | 'createdAt'>> = [
  {
    text: 'Bacalah teks berikut!\n\n"Sekolah kami mengadakan kegiatan kerja bakti setiap hari Jumat. Semua siswa membersihkan ruang kelas dan halaman sekolah. Kebiasaan ini membuat lingkungan sekolah selalu bersih dan nyaman."\n\nGagasan utama paragraf di atas adalah ...',
    optionA: 'Kerja bakti membuat lingkungan sekolah selalu bersih dan nyaman',
    optionB: 'Siswa malas membersihkan ruang kelas',
    optionC: 'Kegiatan kerja bakti dilakukan setiap hari',
    optionD: 'Hanya guru yang ikut kerja bakti',
    correctAnswer: 'a',
    topic: 'Ide Pokok dan Gagasan Pendukung',
    difficulty: 'sedang',
    status: 'accepted',
    validationStatus: 'valid',
    validationReason: null,
  },
  {
    text: 'Makna kata "tekun" pada kalimat "Andi belajar dengan tekun setiap malam" adalah ...',
    optionA: 'Asal-asalan',
    optionB: 'Bersungguh-sungguh',
    optionC: 'Cepat bosan',
    optionD: 'Sambil bermain',
    correctAnswer: 'b',
    topic: 'Kosakata',
    difficulty: 'mudah',
    status: 'accepted',
    validationStatus: 'valid',
    validationReason: null,
  },
  {
    text: 'Kalimat berikut yang menggunakan tanda baca dengan tepat adalah ...',
    optionA: 'Saya membeli, buku pensil, dan penghapus.',
    optionB: 'Ibu pergi ke pasar membeli sayur dan buah-buahan.',
    optionC: 'Apakah kamu sudah makan!',
    optionD: 'Wah indahnya pemandangan ini?',
    correctAnswer: 'b',
    topic: 'Tanda Baca dan Ejaan',
    difficulty: 'sedang',
    status: 'accepted',
    validationStatus: 'valid',
    validationReason: null,
  },
]

function buildReplacement(original: Question, seed: number): Question {
  const tpl = REPLACEMENT_TEMPLATES[seed % REPLACEMENT_TEMPLATES.length] as
    Omit<Question, 'id' | 'examId' | 'number' | 'createdAt'>
  return {
    ...tpl,
    id: `${original.id}-r${seed}`,
    examId: original.examId,
    number: original.number,
    createdAt: new Date().toISOString(),
  }
}

function ReviewPage() {
  const { mode, from } = Route.useSearch()
  const navigate = useNavigate()
  const draft = useExamDraft()
  const { toast } = useToast()

  // Sync URL `mode` into the shared draft once on mount / mode change
  useEffect(() => {
    examDraftStore.setReviewMode(mode)
  }, [mode])

  // Per-question accept/reject state — defaults derived from mode
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>(() =>
    Object.fromEntries(
      draft.questions.map((q) => [q.id, mode === 'fast' ? 'accepted' : 'pending']),
    ),
  )

  // Track which question is being replaced (showing inline spinner)
  const [replacingId, setReplacingId] = useState<string | null>(null)

  // Track which questions have been edited (for dirty-state on switch)
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())

  // Modal state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [pendingSwitchTo, setPendingSwitchTo] = useState<'fast' | 'slow' | null>(null)

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
        search: { mode },
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
          next[q.id] = mode === 'fast' ? 'accepted' : 'pending'
        }
      }
      // remove dangling ids
      for (const id of Object.keys(next)) {
        if (!draft.questions.find((q) => q.id === id)) delete next[id]
      }
      return next
    })
  }, [draft.questions, mode])

  const sekolah = draft.metadata.schoolName
  const tahunPelajaran = draft.metadata.academicYear
  const jenisUjian = draft.metadata.examType
  const tanggal = draft.metadata.examDate
  const durasi = String(draft.metadata.durationMinutes)
  const petunjuk = draft.metadata.instructions

  const setMeta = (patch: Parameters<typeof examDraftStore.setMetadata>[0]) =>
    examDraftStore.setMetadata(patch)

  const questions = draft.questions
  const acceptedCount = useMemo(
    () => Object.values(questionStatuses).filter((s) => s === 'accepted').length,
    [questionStatuses],
  )
  const isMetadataComplete = Boolean(sekolah && tahunPelajaran && jenisUjian && tanggal && durasi)
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

  const handleEditSave = (updated: Question) => {
    examDraftStore.updateQuestion(updated.id, updated)
    setEditedIds((prev) => new Set(prev).add(updated.id))
    setEditingId(null)
  }

  const handleRejectConfirm = () => {
    if (rejectingId === null) return
    const targetId = rejectingId
    setRejectingId(null)
    setQuestionStatuses((prev) => ({ ...prev, [targetId]: 'rejected' }))
    setReplacingId(targetId)

    window.setTimeout(() => {
      const original = examDraftStore.getSnapshot().questions.find((q) => q.id === targetId)
      if (original !== undefined) {
        const replacement = buildReplacement(original, Date.now())
        examDraftStore.replaceQuestion(targetId, replacement)
        setQuestionStatuses((prev) => {
          const next = { ...prev }
          delete next[targetId]
          next[replacement.id] = 'accepted'
          return next
        })
      }
      setReplacingId(null)
    }, 1500)
  }

  const handleRegenerateConfirm = () => {
    setShowRegenConfirm(false)
    examDraftStore.reset()
    void navigate({ to: '/generate' })
  }

  return (
    <div className="space-y-6">
      {/* PageHeader */}
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

      {/* Fast Track Mode */}
      {mode === 'fast' && (
        <div>
          {/* Bulk action bar */}
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

          {/* Question list */}
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

      {/* Slow Track Mode */}
      {mode === 'slow' && (
        <div>
          {/* Bulk action bar */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuestionStatuses(
                  Object.fromEntries(
                    questions.map((q) => [q.id, 'accepted' as QuestionStatus]),
                  ),
                )
              }}
            >
              Terima Semua
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuestionStatuses((prev) =>
                  Object.fromEntries(
                    questions.map((q) => [
                      q.id,
                      prev[q.id] === 'rejected' ? ('pending' as QuestionStatus) : (prev[q.id] ?? 'pending'),
                    ]),
                  ),
                )
              }}
            >
              Ganti ditolak
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSwitchClick('fast')}
              className="ml-auto"
            >
              Switch ke Mode Cepat
            </Button>
          </div>

          {/* Question cards */}
          <div className="space-y-4">
            {questions.map((q) => {
              const status = questionStatuses[q.id] ?? 'pending'
              const isReplacing = replacingId === q.id
              return (
                <Card
                  key={q.id}
                  className={`relative border-l-4 transition-colors ${
                    status === 'accepted'
                      ? 'border-l-success-solid opacity-75'
                      : status === 'rejected'
                        ? 'border-l-danger-solid'
                        : 'border-l-border-default'
                  }`}
                >
                  {/* Replacement spinner overlay */}
                  {isReplacing ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-surface/80 rounded-md">
                      <div className="flex items-center gap-2 text-body-sm text-text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                        <span>Mengganti soal #{q.number}...</span>
                      </div>
                    </div>
                  ) : null}

                  <CardContent className="p-4">
                    {/* Header: number + difficulty badge + topic chip */}
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
                      {status === 'rejected' && !isReplacing && (
                        <span className="ml-auto text-caption text-danger-fg">Perlu diganti</span>
                      )}
                      {status === 'accepted' && !isReplacing && (
                        <span className="ml-auto text-caption text-success-fg flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Diterima
                        </span>
                      )}
                    </div>
                    {/* Question text */}
                    <p className="text-body text-text-primary mb-3 whitespace-pre-line">{q.text}</p>
                    {/* Options */}
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
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-success-fg border-success-border"
                        onClick={() =>
                          setQuestionStatuses((prev) => ({ ...prev, [q.id]: 'accepted' }))
                        }
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
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Metadata form */}
      <div className="mt-8 space-y-5">
        <h3 className="text-h3 font-semibold text-text-primary">Detail Lembar Ujian</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sekolah */}
          <div className="space-y-1.5">
            <Label htmlFor="sekolah">Nama Sekolah</Label>
            <Input
              id="sekolah"
              value={sekolah}
              onChange={(e) => setMeta({ schoolName: e.target.value })}
              placeholder="SD Negeri ..."
            />
          </div>
          {/* Tahun Pelajaran */}
          <div className="space-y-1.5">
            <Label htmlFor="tahun">Tahun Pelajaran</Label>
            <Input
              id="tahun"
              value={tahunPelajaran}
              onChange={(e) => setMeta({ academicYear: e.target.value })}
              placeholder="2025/2026"
            />
          </div>
          {/* Jenis Ujian */}
          <div className="space-y-1.5">
            <Label htmlFor="jenis">Jenis Ujian</Label>
            <Select value={jenisUjian} onValueChange={(v) => setMeta({ examType: v })}>
              <SelectTrigger id="jenis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TKA">TKA</SelectItem>
                <SelectItem value="UTS">UTS</SelectItem>
                <SelectItem value="UAS">UAS</SelectItem>
                <SelectItem value="Ulangan Harian">Ulangan Harian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Tanggal */}
          <div className="space-y-1.5">
            <Label htmlFor="tanggal">Tanggal Ujian</Label>
            <Input
              id="tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setMeta({ examDate: e.target.value })}
            />
          </div>
          {/* Durasi */}
          <div className="space-y-1.5">
            <Label htmlFor="durasi">Durasi (menit)</Label>
            <Input
              id="durasi"
              value={durasi}
              onChange={(e) => setMeta({ durationMinutes: Number(e.target.value) || 0 })}
              placeholder="60"
            />
          </div>
        </div>
        {/* Petunjuk — full width */}
        <div className="space-y-1.5">
          <Label htmlFor="petunjuk">Petunjuk Pengerjaan</Label>
          <Textarea
            id="petunjuk"
            value={petunjuk}
            onChange={(e) => setMeta({ instructions: e.target.value })}
            rows={4}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-default">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowRegenConfirm(true)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
          </Button>
        </div>
        <Button
          disabled={!canPreview}
          onClick={() => void navigate({ to: '/preview' })}
        >
          Preview Lembar <ChevronRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>

      {/* Modals */}
      <QuestionEditDialog
        open={editingId !== null}
        question={editingQuestion}
        onClose={() => setEditingId(null)}
        onSave={handleEditSave}
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
    </div>
  )
}
