import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import type { ClassEntity, CreateClassInput, ExamType, Question, UpdateExamInput } from "@teacher-exam/shared"
import { resolveExamSubjectLabel } from "@teacher-exam/shared"
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  TooltipProvider,
  useToast
} from "@teacher-exam/ui"
import { Match } from "effect"
import { CheckCircle2, ChevronRight, Pencil, RefreshCw, Undo2, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FigureSvg } from "../components/figure-svg.js"
import { MathText } from "../components/math-text.js"
import { CurriculumValidationBadge, needsCurriculumReview } from "../components/review/curriculum-validation-badge.js"
import { FastModeAnswerKeyBadge } from "../components/review/fast-mode-answer-key-badge.js"
import { FastModeTopicBadge } from "../components/review/fast-mode-topic-badge.js"
import { QuestionEditDialog } from "../components/review/question-edit-dialog.js"
import { RegenerateBatchDialog } from "../components/review/regenerate-batch-dialog.js"
import { RegenerateConfirmDialog } from "../components/review/regenerate-confirm-dialog.js"
import { RegenerateQuestionButton } from "../components/review/regenerate-question-button.js"
import { ReviewFastModeLegend } from "../components/review/review-fast-mode-legend.js"
import { SwitchModeDialog } from "../components/review/switch-mode-dialog.js"
import { TolakRegenerateDialog } from "../components/review/tolak-regenerate-dialog.js"
import { api, unwrapApiEither } from "../lib/api.js"
import { examDraftStore, useExamDraft } from "../lib/exam-draft-store.js"
import { matchQuestion } from "../lib/question-render.js"
import { ACADEMIC_YEARS, type QuestionStatus, STATUS_BORDER } from "../lib/review-config.js"
import {
  countAccepted,
  countGenerationFailed,
  countReviewFlagged,
  hasCurriculumValidation as computeHasCurriculumValidation,
  selectVisibleQuestions
} from "../lib/review-selectors.js"

function buildMetadataPatchFromClassTemplate(cls: ClassEntity): Partial<UpdateExamInput> {
  return {
    ...(cls.schoolName ? { schoolName: cls.schoolName } : {}),
    ...(cls.academicYear ? { academicYear: cls.academicYear } : {}),
    ...(cls.defaultExamType ? { examType: cls.defaultExamType } : {}),
    ...(cls.defaultExamDate ? { examDate: cls.defaultExamDate } : {}),
    ...(cls.defaultDurationMinutes !== null ? { durationMinutes: cls.defaultDurationMinutes } : {}),
    ...(cls.defaultInstructions ? { instructions: cls.defaultInstructions } : {})
  }
}

function buildClassTemplatePayload(
  name: string,
  metadata: {
    academicYear: string
    durationMinutes: number
    examDate: string
    examType: ExamType
    instructions: string
    schoolName: string
  },
  exam: { grade: number; subject: CreateClassInput["subject"] | null }
): CreateClassInput {
  const schoolName = metadata.schoolName.trim()
  const academicYear = metadata.academicYear.trim()
  const examDate = metadata.examDate.trim()
  const instructions = metadata.instructions.trim()
  return {
    name,
    grade: exam.grade as CreateClassInput["grade"],
    defaultExamType: metadata.examType,
    ...(exam.subject !== null && exam.subject !== undefined ? { subject: exam.subject } : {}),
    ...(schoolName.length > 0 ? { schoolName } : {}),
    ...(academicYear.length > 0 ? { academicYear } : {}),
    ...(examDate.length > 0 ? { defaultExamDate: examDate } : {}),
    ...(metadata.durationMinutes > 0 ? { defaultDurationMinutes: metadata.durationMinutes } : {}),
    ...(instructions.length > 0 ? { defaultInstructions: instructions } : {})
  }
}

export const Route = createFileRoute("/_auth/review")({
  component: ReviewPage,
  pendingComponent: ReviewSkeleton,
  validateSearch: (search): { mode: "fast" | "slow"; from?: "generate"; examId?: string } => {
    const result: { mode: "fast" | "slow"; from?: "generate"; examId?: string } = {
      mode: (search["mode"] as "fast" | "slow") ?? "fast"
    }
    if (search["from"] === "generate") result.from = "generate"
    if (typeof search["examId"] === "string") result.examId = search["examId"]
    return result
  },
  loaderDeps: ({ search }) => ({ examId: search.examId }),
  loader: async ({ deps }) => {
    const { examId } = deps
    if (!examId) throw redirect({ to: "/dashboard" })
    const exam = unwrapApiEither(await api.exams.get(examId))
    examDraftStore.setQuestions([...exam.questions])
    examDraftStore.setReviewMode(exam.reviewMode as "fast" | "slow")
    examDraftStore.setConfig({
      subject: exam.subject,
      subjectLabel: resolveExamSubjectLabel({
        subject: exam.subject,
        subjectLabel: exam.subjectLabel
      }),
      grade: exam.grade,
      topic: exam.topics.join(", "),
      examType: exam.examType as ExamType,
      classContext: exam.classContext ?? ""
    })
    examDraftStore.setMetadata({
      schoolName: exam.schoolName ?? "",
      academicYear: exam.academicYear ?? "",
      examDate: exam.examDate ?? "",
      durationMinutes: exam.durationMinutes ?? 60,
      instructions: exam.instructions ?? ""
    })
    examDraftStore.setGenerationState({
      generationIncomplete: exam.generationIncomplete === true,
      failedQuestionNumbers: exam.failedQuestionNumbers
        ? [...exam.failedQuestionNumbers]
        : []
    })
    return exam
  }
})

function ReviewPage() {
  const { examId, from, mode } = Route.useSearch()
  const exam = Route.useLoaderData()
  const navigate = useNavigate()
  const draft = useExamDraft()
  const { toast } = useToast()
  const [classTemplates, setClassTemplates] = useState<ReadonlyArray<ClassEntity>>([])
  const [selectedClassTemplateId, setSelectedClassTemplateId] = useState("manual")
  const [applyingClassTemplate, setApplyingClassTemplate] = useState(false)
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [savingClassTemplate, setSavingClassTemplate] = useState(false)

  // Sync URL `mode` into the shared draft once on mount / mode change
  useEffect(() => {
    examDraftStore.setReviewMode(mode)
  }, [mode])

  useEffect(() => {
    let cancelled = false
    async function loadClassTemplates() {
      try {
        const list = unwrapApiEither(await api.classes.list())
        if (!cancelled) setClassTemplates(list as ReadonlyArray<ClassEntity>)
      } catch {
        if (!cancelled) setClassTemplates([])
      }
    }
    void loadClassTemplates()
    return () => {
      cancelled = true
    }
  }, [])

  // Per-question accept/reject state — fast mode always starts accepted; slow mode seeds from server
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>(() =>
    Object.fromEntries(
      draft.questions.map((q) => [
        q.id,
        mode === "fast"
          ? (q.generationFailed === true ? "pending" : "accepted")
          : ((q.status as QuestionStatus | undefined) ?? "pending")
      ])
    )
  )

  // Track which questions have been edited (for dirty-state on switch)
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [pendingSwitchTo, setPendingSwitchTo] = useState<"fast" | "slow" | null>(null)
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const [failedRegenIds, setFailedRegenIds] = useState<Set<string>>(new Set())
  const [regenBatchDialogOpen, setRegenBatchDialogOpen] = useState(false)
  const [batchRegenerating, setBatchRegenerating] = useState(false)
  const [reviewOnlyFilter, setReviewOnlyFilter] = useState(false)
  const [curriculumValidating, setCurriculumValidating] = useState(false)
  const [newReplacementIds, setNewReplacementIds] = useState<Set<string>>(new Set())
  type TolakDialogState =
    | { kind: "closed" }
    | { kind: "open"; questionId: string; mode: "tolak" | "retry"; initialHint?: string }
  const [tolakDialogState, setTolakDialogState] = useState<TolakDialogState>({ kind: "closed" })

  // Transient maps — refs avoid re-renders on mutation
  const lastHintsRef = useRef<Record<string, string>>({})
  const prevSnapshotsRef = useRef<Record<string, Question>>({})
  const newBadgeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Cleanup any pending "Soal baru" timers on unmount
  useEffect(() => {
    return () => {
      for (const t of Object.values(newBadgeTimersRef.current)) clearTimeout(t)
      newBadgeTimersRef.current = {}
    }
  }, [])

  // Toast + strip ?from=generate from URL after first render so refresh doesn't re-trigger
  useEffect(() => {
    if (from === "generate") {
      const failedCount = exam?.failedQuestionNumbers?.length ??
        draft.questions.filter((q) => q.generationFailed === true).length
      if (exam?.generationIncomplete === true && failedCount > 0) {
        toast({
          variant: "warning",
          title: `${failedCount} soal perlu dibuat ulang`,
          description:
            "Sebagian soal gagal dibuat otomatis. Gunakan Regenerate pada baris yang bermasalah sebelum lanjut."
        })
        setReviewOnlyFilter(true)
      } else {
        toast({
          variant: "success",
          title: "Lembar berhasil dibuat",
          description: `${draft.questions.length} soal berhasil dibuat — siap di-review.`
        })
      }
      void navigate({
        to: "/review",
        search: examId !== undefined ? { mode, examId } : { mode },
        replace: true
      })
    }
  }, [])

  // Re-sync statuses if questions list shape changes (e.g. after replacement)
  useEffect(() => {
    setQuestionStatuses((prev) => {
      const next = { ...prev }
      for (const q of draft.questions) {
        if (!(q.id in next)) {
          next[q.id] = mode === "fast"
            ? (q.generationFailed === true ? "pending" : "accepted")
            : ((q.status as QuestionStatus | undefined) ?? "pending")
        }
      }
      for (const id of Object.keys(next)) {
        if (!draft.questions.find((q) => q.id === id)) delete next[id]
      }
      return next
    })
  }, [draft.questions, mode])

  const {
    academicYear = "",
    durationMinutes,
    examDate = "",
    examType,
    instructions = "",
    schoolName = ""
  } = draft.metadata

  const persistMetaField = useCallback(async (patch: Partial<UpdateExamInput>) => {
    if (!examId) return
    try {
      unwrapApiEither(await api.exams.patch(examId, patch))
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan metadata",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    }
  }, [examId, toast])

  const handleClassTemplateSelect = async (value: string) => {
    setSelectedClassTemplateId(value)
    if (value === "manual") return
    const cls = classTemplates.find((item) => item.id === value)
    if (!cls || !examId) return

    const patch = buildMetadataPatchFromClassTemplate(cls)
    if (Object.keys(patch).length === 0) return

    examDraftStore.setMetadata({
      ...(patch.schoolName !== undefined ? { schoolName: patch.schoolName } : {}),
      ...(patch.academicYear !== undefined ? { academicYear: patch.academicYear } : {}),
      ...(patch.examType !== undefined ? { examType: patch.examType } : {}),
      ...(patch.examDate !== undefined ? { examDate: patch.examDate } : {}),
      ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
      ...(patch.instructions !== undefined ? { instructions: patch.instructions } : {})
    })

    setApplyingClassTemplate(true)
    try {
      unwrapApiEither(await api.exams.patch(examId, patch))
      toast({ variant: "success", title: "Template kelas diterapkan" })
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menerapkan template",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    } finally {
      setApplyingClassTemplate(false)
    }
  }

  const buildCurrentTemplatePayload = (name: string): CreateClassInput =>
    buildClassTemplatePayload(
      name,
      {
        academicYear,
        durationMinutes,
        examDate,
        examType,
        instructions,
        schoolName
      },
      { grade: exam.grade, subject: exam.subject }
    )

  const openSaveTemplateDialog = () => {
    if (selectedClassTemplateId !== "manual") {
      void handleUpdateSelectedTemplate()
      return
    }
    setNewTemplateName(schoolName || "Template lembar ujian")
    setSaveTemplateDialogOpen(true)
  }

  const handleCreateTemplateFromMetadata = async () => {
    const name = newTemplateName.trim()
    if (name.length === 0) return
    setSavingClassTemplate(true)
    try {
      const created = unwrapApiEither(await api.classes.create(buildCurrentTemplatePayload(name)))
      setClassTemplates((prev) => [created, ...prev])
      setSelectedClassTemplateId(created.id)
      setSaveTemplateDialogOpen(false)
      toast({ variant: "success", title: "Template kelas disimpan" })
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan template",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    } finally {
      setSavingClassTemplate(false)
    }
  }

  async function handleUpdateSelectedTemplate() {
    const selected = classTemplates.find((cls) => cls.id === selectedClassTemplateId)
    if (!selected) return
    setSavingClassTemplate(true)
    try {
      const updated = unwrapApiEither(
        await api.classes.update(selected.id, buildCurrentTemplatePayload(selected.name))
      )
      setClassTemplates((prev) => prev.map((cls) => cls.id === updated.id ? updated : cls))
      toast({ variant: "success", title: "Template kelas diperbarui" })
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal memperbarui template",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    } finally {
      setSavingClassTemplate(false)
    }
  }

  const questions = draft.questions
  const hasCurriculumValidation = useMemo(
    () => computeHasCurriculumValidation(questions),
    [questions]
  )
  const reviewFlaggedCount = useMemo(
    () => countReviewFlagged(questions),
    [questions]
  )
  const visibleQuestions = useMemo(
    () => selectVisibleQuestions(questions, reviewOnlyFilter),
    [questions, reviewOnlyFilter]
  )
  const generationFailedCount = useMemo(
    () => countGenerationFailed(questions),
    [questions]
  )
  const acceptedCount = useMemo(
    () => countAccepted(questionStatuses),
    [questionStatuses]
  )
  const isMetadataComplete = Boolean(schoolName && academicYear && examType && examDate && durationMinutes)
  const canPreview = acceptedCount === questions.length &&
    isMetadataComplete &&
    generationFailedCount === 0
  const isRegenerating = regeneratingIds.size > 0 || batchRegenerating

  const editingQuestion = editingId !== null
    ? questions.find((q) => q.id === editingId) ?? null
    : null

  const tolakDialogQuestion = tolakDialogState.kind === "open"
    ? questions.find((q) => q.id === tolakDialogState.questionId) ?? null
    : null

  const isDirty = editedIds.size > 0 ||
    Object.values(questionStatuses).some((s) => s === "rejected") ||
    (mode === "slow" && Object.values(questionStatuses).some((s) => s === "accepted"))

  const handleSwitchClick = (target: "fast" | "slow") => {
    if (isDirty) {
      setPendingSwitchTo(target)
    } else {
      void navigate({ to: "/review", search: (prev) => ({ ...prev, mode: target }) })
    }
  }

  const handleSwitchConfirm = () => {
    if (pendingSwitchTo === null) return
    const target = pendingSwitchTo
    setPendingSwitchTo(null)
    void navigate({ to: "/review", search: (prev) => ({ ...prev, mode: target }) })
  }

  const handleEditSave = async (updated: Question) => {
    const original = questions.find((q) => q.id === updated.id)
    if (!original) return

    const diff = matchQuestion(updated, {
      mcq_single: (u) => {
        const o = original as typeof u
        const d: Record<string, unknown> = { _tag: "mcq_single" }
        if (u.text !== o.text) d["text"] = u.text
        if (u.correct !== o.correct) d["correct"] = u.correct
        if (JSON.stringify(u.options) !== JSON.stringify(o.options)) d["options"] = u.options
        return d
      },
      mcq_multi: (u) => {
        const o = original as typeof u
        const d: Record<string, unknown> = { _tag: "mcq_multi" }
        if (u.text !== o.text) d["text"] = u.text
        if (JSON.stringify(u.correct) !== JSON.stringify(o.correct)) d["correct"] = u.correct
        if (JSON.stringify(u.options) !== JSON.stringify(o.options)) d["options"] = u.options
        return d
      },
      true_false: (u) => {
        const o = original as typeof u
        const d: Record<string, unknown> = { _tag: "true_false" }
        if (u.text !== o.text) d["text"] = u.text
        if (JSON.stringify(u.statements) !== JSON.stringify(o.statements)) d["statements"] = u.statements
        return d
      }
    })

    // PRD US-9: Edit preserves current status — teacher-authored edits do not change approval state.
    const hasChanges = Object.keys(diff).filter((k) => k !== "_tag").length > 0

    setEditingId(null)
    if (!hasChanges) return

    examDraftStore.replaceQuestion(updated.id, updated)
    setEditedIds((prev) => new Set(prev).add(updated.id))
    try {
      const server = unwrapApiEither(
        await api.questions.patch(updated.id, diff as Parameters<typeof api.questions.patch>[1])
      )
      examDraftStore.replaceQuestion(server.id, server)
      toast({
        variant: "success",
        title: "Soal disimpan"
      })
    } catch (err) {
      examDraftStore.replaceQuestion(updated.id, original)
      toast({
        variant: "error",
        title: "Gagal menyimpan perubahan",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    }
  }

  const clearNewBadge = useCallback((id: string) => {
    const timer = newBadgeTimersRef.current[id]
    if (timer) {
      clearTimeout(timer)
      delete newBadgeTimersRef.current[id]
    }
    setNewReplacementIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const scheduleNewBadge = useCallback((id: string) => {
    const existing = newBadgeTimersRef.current[id]
    if (existing) clearTimeout(existing)
    setNewReplacementIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    newBadgeTimersRef.current[id] = setTimeout(() => {
      delete newBadgeTimersRef.current[id]
      setNewReplacementIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 8000)
  }, [])

  const setStatus = async (id: string, status: QuestionStatus) => {
    const prev = questionStatuses[id] ?? "pending"
    if (prev === status) return
    clearNewBadge(id)
    setQuestionStatuses((p) => ({ ...p, [id]: status }))
    try {
      unwrapApiEither(await api.questions.patch(id, { status }))
    } catch (err) {
      setQuestionStatuses((p) => ({ ...p, [id]: prev }))
      toast({
        variant: "error",
        title: status === "accepted" ? "Gagal menerima soal" : "Gagal menolak soal",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    }
  }

  const openTolakDialog = (qId: string) => {
    clearNewBadge(qId)
    setTolakDialogState({ kind: "open", questionId: qId, mode: "tolak" })
  }

  const openRetryDialog = (qId: string) => {
    const initialHint = lastHintsRef.current[qId] ?? ""
    setTolakDialogState({ kind: "open", questionId: qId, mode: "retry", initialHint })
  }

  const closeTolakDialog = () => setTolakDialogState({ kind: "closed" })

  const handleTolakRegenerateConfirm = (hint?: string) => {
    if (tolakDialogState.kind !== "open") return
    const { mode, questionId } = tolakDialogState
    if (mode === "tolak") {
      const current = questions.find((q) => q.id === questionId)
      if (current) prevSnapshotsRef.current[questionId] = current
    }
    if (hint !== undefined) {
      lastHintsRef.current[questionId] = hint
    } else {
      delete lastHintsRef.current[questionId]
    }
    setTolakDialogState({ kind: "closed" })
    void handleRegenerateOne(questionId, hint)
  }

  const handleValidateCurriculum = async () => {
    if (!examId || curriculumValidating) return
    const count = questions.filter((q) => q.generationFailed !== true).length
    if (count === 0) return

    setCurriculumValidating(true)
    toast({
      title: "Memeriksa kurikulum…",
      description: `Memeriksa ${count} soal (bisa ~2 menit).`
    })
    try {
      const updated = unwrapApiEither(await api.exams.validateCurriculum(examId))
      examDraftStore.setQuestions([...updated.questions])
      const flagged = updated.questions.filter((q) => needsCurriculumReview(q.validationStatus)).length
      toast({
        variant: flagged > 0 ? "warning" : "success",
        title: "Pemeriksaan selesai",
        description: flagged > 0
          ? `${flagged} soal perlu review kurikulum.`
          : "Semua soal sesuai kurikulum."
      })
    } catch (err) {
      toast({
        variant: "error",
        title: "Pemeriksaan kurikulum gagal",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
    } finally {
      setCurriculumValidating(false)
    }
  }

  const handleBatalkan = (qId: string) => {
    const snapshot = prevSnapshotsRef.current[qId]
    if (snapshot) {
      examDraftStore.replaceQuestion(qId, snapshot)
      setQuestionStatuses((prev) => ({
        ...prev,
        [qId]: (snapshot.status as QuestionStatus | undefined) ?? "pending"
      }))
      delete prevSnapshotsRef.current[qId]
    }
    delete lastHintsRef.current[qId]
    setFailedRegenIds((prev) => {
      if (!prev.has(qId)) return prev
      const next = new Set(prev)
      next.delete(qId)
      return next
    })
  }

  const handleRetryAllFailed = async () => {
    const ids = Array.from(failedRegenIds)
    if (ids.length === 0) return
    setBatchRegenerating(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) => handleRegenerateOne(id, lastHintsRef.current[id]))
      )
      const succeededCount = results.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length
      const failedCount = ids.length - succeededCount
      if (failedCount > 0) {
        toast({
          variant: "error",
          title: `Berhasil ${succeededCount} · Gagal ${failedCount}`,
          description: "Soal yang masih gagal perlu dicoba ulang satu per satu."
        })
      } else {
        toast({
          variant: "success",
          title: `${succeededCount} soal berhasil diganti`
        })
      }
    } finally {
      setBatchRegenerating(false)
    }
  }

  const handleRegenerateOne = async (id: string, hint?: string): Promise<boolean> => {
    setRegeneratingIds((prev) => new Set(prev).add(id))
    try {
      const server = unwrapApiEither(await api.questions.regenerate(id, hint !== undefined ? { hint } : {}))
      examDraftStore.updateQuestion(id, server)
      setQuestionStatuses((prev) => ({
        ...prev,
        [id]: mode === "fast" ? "accepted" : "pending"
      }))
      setFailedRegenIds((prev) => {
        if (!prev.has(id)) return prev
        const s = new Set(prev)
        s.delete(id)
        return s
      })
      delete prevSnapshotsRef.current[id]
      delete lastHintsRef.current[id]
      scheduleNewBadge(id)
      const stillFailed = examDraftStore
        .getSnapshot()
        .questions.some((q) => q.generationFailed === true)
      if (!stillFailed) {
        examDraftStore.setGenerationState({
          generationIncomplete: false,
          failedQuestionNumbers: []
        })
      }
      return true
    } catch (err) {
      setFailedRegenIds((prev) => new Set(prev).add(id))
      toast({
        variant: "error",
        title: "Gagal mengganti soal",
        description: err instanceof Error ? err.message : "Coba lagi."
      })
      return false
    } finally {
      setRegeneratingIds((prev) => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
    }
  }

  const handleTerimaSemuaClick = async () => {
    const pending = questions.filter((q) => (questionStatuses[q.id] ?? "pending") !== "accepted")
    if (pending.length === 0) return
    const prevStatuses = Object.fromEntries(
      pending.map((q) => [q.id, questionStatuses[q.id] ?? "pending"] as const)
    )
    setQuestionStatuses((p) => ({
      ...p,
      ...Object.fromEntries(pending.map((q) => [q.id, "accepted" as const]))
    }))
    const results = await Promise.allSettled(
      pending.map((q) => api.questions.patch(q.id, { status: "accepted" }).then(unwrapApiEither))
    )
    const failedIds = pending
      .filter((_, i) => results[i]?.status === "rejected")
      .map((q) => q.id)
    if (failedIds.length > 0) {
      setQuestionStatuses((p) => ({
        ...p,
        ...Object.fromEntries(failedIds.map((id) => [id, prevStatuses[id] ?? "pending"] as const))
      }))
      toast({
        variant: "error",
        title: `Gagal menerima ${failedIds.length} soal`,
        description: "Sebagian soal perlu dicoba ulang."
      })
    }
  }

  const [finalizing, setFinalizing] = useState(false)

  const handlePreviewClick = async () => {
    if (!examId) return
    if (generationFailedCount > 0) {
      toast({
        variant: "warning",
        title: "Selesaikan soal yang gagal dibuat",
        description: `Masih ada ${generationFailedCount} soal yang perlu di-Regenerate sebelum preview.`
      })
      return
    }
    setFinalizing(true)
    try {
      if (mode === "fast") {
        const toSync = draft.questions.filter((q) => (q.status as string) !== "accepted")
        if (toSync.length > 0) {
          await Promise.allSettled(
            toSync.map((q) => api.questions.patch(q.id, { status: "accepted" }).then(unwrapApiEither))
          )
        }
      }
      unwrapApiEither(await api.exams.finalize(examId))
      void navigate({ to: "/preview", search: { examId } })
    } catch (err) {
      const code = err != null && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined
      let description = "Coba lagi."
      if (err instanceof Error) description = err.message
      if (code === "FINALIZE_NOT_ALLOWED") description = "Semua soal harus diterima sebelum finalisasi."
      toast({ variant: "error", title: "Gagal finalisasi", description })
    } finally {
      setFinalizing(false)
    }
  }

  const handleRegenerateConfirm = () => {
    setShowRegenConfirm(false)
    examDraftStore.reset()
    void navigate({ to: "/generate" })
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-6">
        {mode === "fast" ?
          (
            <PageHeader
              title="Konfirmasi Paket"
              subtitle={`${questions.length} soal auto-diterima`}
              onBack={() => {
                void navigate({ to: "/generate" })
              }}
            >
              <Badge variant="secondary">Mode Cepat</Badge>
            </PageHeader>
          ) :
          (
            <PageHeader
              title={`Review (${questions.length} soal)`}
              onBack={() => {
                void navigate({ to: "/generate" })
              }}
            >
              <Badge variant="secondary">{acceptedCount} dari {questions.length} siap</Badge>
            </PageHeader>
          )}

        {generationFailedCount > 0 ?
          (
            <div
              className="rounded-sm border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-fg"
              data-testid="generation-incomplete-banner"
            >
              <p className="font-medium">
                {generationFailedCount} soal gagal dibuat otomatis
              </p>
              <p className="text-caption mt-1 text-warning-fg/90">
                Gunakan Regenerate pada soal yang bermasalah sebelum melanjutkan ke preview.
              </p>
            </div>
          ) :
          null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={curriculumValidating || questions.length === 0}
            onClick={() => void handleValidateCurriculum()}
            data-testid="validate-curriculum-btn"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${curriculumValidating ? "animate-spin" : ""}`}
              aria-hidden
            />
            {hasCurriculumValidation ? "Periksa ulang kurikulum" : "Periksa kurikulum"}
          </Button>
          <label className="inline-flex items-center gap-2 text-body-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="rounded-xs border-border-default"
              checked={reviewOnlyFilter}
              onChange={(e) => setReviewOnlyFilter(e.target.checked)}
              data-testid="review-only-filter"
            />
            Perlu review only
          </label>
          {reviewFlaggedCount > 0 ?
            (
              <Badge variant="warning" className="text-caption">
                {reviewFlaggedCount} perlu review
              </Badge>
            ) :
            null}
          {reviewOnlyFilter && visibleQuestions.length === 0 ?
            <span className="text-caption text-text-tertiary">Semua soal sesuai kurikulum.</span> :
            null}
        </div>

        {mode === "fast" && (
          <div>
            <ReviewFastModeLegend />

            <div className="flex items-center justify-between mb-4 mt-4">
              <span className="text-body-sm text-text-secondary">
                {questions.length} soal auto-diterima
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSwitchClick("slow")}
              >
                Switch ke Review Detail
              </Button>
            </div>

            <div className="max-h-[480px] overflow-y-auto rounded-sm border border-border-default divide-y divide-border-default">
              {visibleQuestions.map((q) => (
                <div
                  key={q.id}
                  data-testid={q.generationFailed === true ? `fast-failed-row-${q.number}` : undefined}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    q.generationFailed === true
                      ? "bg-danger-bg/40 border-l-4 border-l-danger-solid"
                      : "hover:bg-kertas-50"
                  }`}
                >
                  <span className="text-caption text-text-tertiary font-mono w-6 shrink-0">
                    {q.number}.
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    {q.generationFailed === true ?
                      <span className="text-caption font-medium text-danger-fg">Gagal dibuat</span> :
                      null}
                    <p className="text-body-sm text-text-primary truncate min-w-0">
                      <MathText text={q.text.split("\n")[0] ?? ""} />
                    </p>
                    {q.figure ? <FigureSvg figure={q.figure} /> : null}
                  </div>
                  {q.validationStatus && q.generationFailed !== true ?
                    (
                      <CurriculumValidationBadge
                        status={q.validationStatus}
                        reason={q.validationReason}
                        compact
                      />
                    ) :
                    null}
                  {q.generationFailed === true ?
                    (
                      <div className="flex shrink-0 items-center gap-2">
                        <RegenerateQuestionButton
                          loading={regeneratingIds.has(q.id)}
                          failedRetry={failedRegenIds.has(q.id)}
                          disabled={isRegenerating && !regeneratingIds.has(q.id)}
                          onClick={() =>
                            failedRegenIds.has(q.id)
                              ? openRetryDialog(q.id)
                              : void handleRegenerateOne(q.id)}
                          testId={`fast-regenerate-${q.number}`}
                        />
                      </div>
                    ) :
                    (
                      <>
                        <FastModeAnswerKeyBadge question={q} />
                        {q.topic ? <FastModeTopicBadge topic={q.topic} /> : null}
                        <button
                          type="button"
                          onClick={() => setEditingId(q.id)}
                          className="p-1 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
                          aria-label={`Edit cepat soal ${q.number}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "slow" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="secondary"
                size="sm"
                disabled={isRegenerating ||
                  questions.every((q) => (questionStatuses[q.id] ?? "pending") === "accepted")}
                onClick={() => {
                  void handleTerimaSemuaClick()
                }}
              >
                Terima Semua
              </Button>
              {failedRegenIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={batchRegenerating}
                  onClick={() => setRegenBatchDialogOpen(true)}
                >
                  {batchRegenerating ?
                    (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Mengganti...
                      </>
                    ) :
                    (
                      `Coba lagi yang gagal (${failedRegenIds.size})`
                    )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSwitchClick("fast")}
                className="ml-auto"
              >
                Switch ke Mode Cepat
              </Button>
            </div>

            <div className="space-y-4">
              {visibleQuestions.map((q) => {
                const status = questionStatuses[q.id] ?? "pending"
                return (
                  <Card
                    key={q.id}
                    className={`relative border-l-4 transition-colors ${
                      q.generationFailed === true
                        ? "border-l-danger-solid bg-danger-bg/20"
                        : STATUS_BORDER[status]
                    }`}
                  >
                    <CardContent className="p-4">
                      {q.validationStatus && q.generationFailed !== true ?
                        (
                          <div className="absolute top-3 right-3">
                            <CurriculumValidationBadge
                              status={q.validationStatus}
                              reason={q.validationReason}
                            />
                          </div>
                        ) :
                        null}
                      {regeneratingIds.has(q.id) ?
                        (
                          <div className="space-y-3" role="status" aria-live="polite">
                            <div className="flex items-center gap-2 text-body-sm font-semibold text-text-secondary">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              AI sedang mengganti soal...
                            </div>
                            <div className="animate-pulse space-y-3">
                              <div className="h-4 bg-kertas-200 rounded w-3/4" />
                              <div className="h-4 bg-kertas-200 rounded w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 bg-kertas-100 rounded" />)}
                            </div>
                          </div>
                        ) :
                        (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-mono text-caption text-text-tertiary">{q.number}.</span>
                              {q.difficulty && (
                                <Badge variant="secondary" className="text-caption">
                                  {q.difficulty}
                                </Badge>
                              )}
                              {q.topic && <span className="text-caption text-text-tertiary">{q.topic}</span>}
                              {editedIds.has(q.id) && (
                                <Badge variant="secondary" className="text-caption">
                                  Diedit
                                </Badge>
                              )}
                              {newReplacementIds.has(q.id) && (
                                <Badge
                                  variant="secondary"
                                  className="text-caption bg-info-bg text-info-fg border-info-border animate-in fade-in"
                                >
                                  Soal baru
                                </Badge>
                              )}
                              {failedRegenIds.has(q.id) && (
                                <span className="ml-auto text-caption text-danger-fg">Regenerate gagal</span>
                              )}
                              {!failedRegenIds.has(q.id) && status === "accepted" && (
                                <span className="ml-auto text-caption text-success-fg flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Diterima
                                </span>
                              )}
                            </div>
                            <p className="text-body text-text-primary mb-3 whitespace-pre-line">
                              <MathText text={q.text} />
                            </p>
                            {q.figure ? <FigureSvg figure={q.figure} /> : null}
                            {matchQuestion(q, {
                              mcq_single: (sq) => (
                                <div className="grid grid-cols-2 gap-1 mb-4">
                                  {(["a", "b", "c", "d"] as const).map((letter) => (
                                    <div
                                      key={letter}
                                      data-testid={`slow-option-${letter}-${sq.id}`}
                                      className={`text-body-sm px-3 py-1.5 rounded-xs flex gap-2 ${
                                        sq.correct === letter
                                          ? "bg-success-bg text-success-fg font-medium"
                                          : "text-text-secondary"
                                      }`}
                                    >
                                      <span className="font-mono text-caption shrink-0">
                                        {letter.toUpperCase()}.
                                      </span>
                                      <span>
                                        <MathText text={sq.options[letter]} />
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ),
                              mcq_multi: (mq) => (
                                <div className="grid grid-cols-2 gap-1 mb-4">
                                  {(["a", "b", "c", "d"] as const).map((letter) => (
                                    <div
                                      key={letter}
                                      data-testid={`slow-option-${letter}-${mq.id}`}
                                      className={`text-body-sm px-3 py-1.5 rounded-xs flex gap-2 ${
                                        mq.correct.includes(letter)
                                          ? "bg-success-bg text-success-fg font-medium"
                                          : "text-text-secondary"
                                      }`}
                                    >
                                      <span className="font-mono text-caption shrink-0">
                                        {letter.toUpperCase()}.
                                      </span>
                                      <span>
                                        <MathText text={mq.options[letter]} />
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ),
                              true_false: (tf) => (
                                <div className="space-y-2 mb-4">
                                  {tf.statements.map((s, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-3 px-3 py-2 rounded-xs border border-border-default"
                                    >
                                      <span className="font-mono text-caption shrink-0 w-5">{idx + 1}.</span>
                                      <span className="flex-1 text-body-sm text-text-primary">
                                        <MathText text={s.text} />
                                      </span>
                                      <span
                                        className={`font-mono font-semibold text-body-sm px-2 py-0.5 rounded-xs ${
                                          s.answer ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg"
                                        }`}
                                      >
                                        {s.answer ? "B" : "S"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                            <div className="flex gap-2 flex-wrap">
                              {q.generationFailed === true ?
                                (
                                  failedRegenIds.has(q.id) ?
                                    (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={isRegenerating}
                                        onClick={() => openRetryDialog(q.id)}
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba lagi
                                      </Button>
                                    ) :
                                    (
                                      <Button
                                        size="sm"
                                        disabled={isRegenerating}
                                        onClick={() => void handleRegenerateOne(q.id)}
                                        data-testid={`slow-regenerate-${q.number}`}
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                                      </Button>
                                    )
                                ) :
                                failedRegenIds.has(q.id) ?
                                (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={isRegenerating}
                                      onClick={() => openRetryDialog(q.id)}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba lagi
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={isRegenerating}
                                      onClick={() => handleBatalkan(q.id)}
                                    >
                                      Batalkan
                                    </Button>
                                  </>
                                ) :
                                Match.value(status).pipe(
                                  Match.when("accepted", () => (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          void setStatus(q.id, "pending")
                                        }}
                                      >
                                        <Undo2 className="h-3.5 w-3.5 mr-1.5" /> Batalkan terima
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isRegenerating}
                                        onClick={() => setEditingId(q.id)}
                                      >
                                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                      </Button>
                                    </>
                                  )),
                                  Match.when("pending", () => (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-success-fg border-success-border"
                                        onClick={() => {
                                          void setStatus(q.id, "accepted")
                                        }}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Terima
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isRegenerating}
                                        onClick={() => setEditingId(q.id)}
                                      >
                                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-danger-fg hover:text-danger-fg"
                                        disabled={isRegenerating}
                                        onClick={() => openTolakDialog(q.id)}
                                      >
                                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Tolak
                                      </Button>
                                    </>
                                  )),
                                  Match.when("rejected", () => (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-success-fg border-success-border"
                                        onClick={() => {
                                          void setStatus(q.id, "accepted")
                                        }}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Terima
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isRegenerating}
                                        onClick={() => setEditingId(q.id)}
                                      >
                                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                      </Button>
                                    </>
                                  )),
                                  Match.exhaustive
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
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-h3 font-semibold text-text-primary">Detail Lembar Ujian</h3>
              <p className="text-body-sm text-text-tertiary mt-1">
                Pilih template kelas atau isi manual untuk lembar ini.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(220px,320px)_auto] gap-3 md:min-w-[460px]">
              <div className="space-y-1.5">
                <Label htmlFor="class-template">Template Kelas</Label>
                <Select
                  value={selectedClassTemplateId}
                  onValueChange={(value) => {
                    void handleClassTemplateSelect(value)
                  }}
                  disabled={applyingClassTemplate}
                >
                  <SelectTrigger id="class-template">
                    <SelectValue placeholder="Pilih template kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Tanpa template</SelectItem>
                    {classTemplates.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                        {cls.schoolName ? ` · ${cls.schoolName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                className="self-end"
                onClick={openSaveTemplateDialog}
                disabled={savingClassTemplate}
              >
                {savingClassTemplate ? "Menyimpan..." : "Simpan sebagai template"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="sekolah">Nama Sekolah</Label>
              <Input
                id="sekolah"
                value={schoolName}
                onChange={(e) => examDraftStore.setMetadata({ schoolName: e.target.value })}
                onBlur={(e) => {
                  void persistMetaField({ schoolName: e.target.value })
                }}
                placeholder="SD Negeri ..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tahun">Tahun Pelajaran</Label>
              <Select
                value={academicYear}
                onValueChange={(v) => {
                  examDraftStore.setMetadata({ academicYear: v })
                  void persistMetaField({ academicYear: v })
                }}
              >
                <SelectTrigger id="tahun">
                  <SelectValue placeholder="Pilih tahun pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
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
                onCommit={(iso) => {
                  void persistMetaField({ examDate: iso })
                }}
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
                  if (raw === "") {
                    examDraftStore.setMetadata({ durationMinutes: 0 })
                    return
                  }
                  const n = parseInt(raw, 10)
                  if (!Number.isNaN(n)) examDraftStore.setMetadata({ durationMinutes: n })
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) void persistMetaField({ durationMinutes: val })
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
              onBlur={(e) => {
                void persistMetaField({ instructions: e.target.value })
              }}
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
            onClick={() => {
              void handlePreviewClick()
            }}
          >
            {finalizing ? "Menyimpan..." : "Preview Lembar"}
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>

        {editingQuestion !== null ?
          (
            <QuestionEditDialog
              open
              question={editingQuestion}
              subject={exam.subject ?? undefined}
              onClose={() => setEditingId(null)}
              onSave={(updated) => {
                void handleEditSave(updated)
              }}
            />
          ) :
          null}
        <TolakRegenerateDialog
          open={tolakDialogState.kind === "open"}
          questionNumber={tolakDialogQuestion?.number ?? null}
          {...(tolakDialogState.kind === "open" && tolakDialogState.initialHint !== undefined
            ? { initialHint: tolakDialogState.initialHint }
            : {})}
          onConfirm={handleTolakRegenerateConfirm}
          onClose={closeTolakDialog}
        />
        <RegenerateConfirmDialog
          open={showRegenConfirm}
          acceptedCount={acceptedCount + editedIds.size}
          onConfirm={handleRegenerateConfirm}
          onClose={() => setShowRegenConfirm(false)}
        />
        <SwitchModeDialog
          open={pendingSwitchTo !== null}
          targetMode={pendingSwitchTo ?? "fast"}
          onConfirm={handleSwitchConfirm}
          onClose={() => setPendingSwitchTo(null)}
        />
        <RegenerateBatchDialog
          open={regenBatchDialogOpen}
          onOpenChange={setRegenBatchDialogOpen}
          count={failedRegenIds.size}
          onConfirm={() => {
            void handleRetryAllFailed()
          }}
        />
        <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Simpan sebagai template</DialogTitle>
              <DialogDescription>
                Beri nama template agar mudah dipilih lagi di Detail Lembar Ujian.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="new-template-name">Nama template</Label>
              <Input
                id="new-template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setSaveTemplateDialogOpen(false)}
                disabled={savingClassTemplate}
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  void handleCreateTemplateFromMetadata()
                }}
                disabled={savingClassTemplate || newTemplateName.trim().length === 0}
              >
                {savingClassTemplate ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded bg-kertas-100" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-kertas-100" />
          <div className="h-4 w-32 rounded bg-kertas-100" />
        </div>
      </div>
      {/* Action bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-kertas-100" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-kertas-100" />
          <div className="h-8 w-32 rounded bg-kertas-100" />
        </div>
      </div>
      {/* Question cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-28 rounded-md bg-kertas-100" />)}
      </div>
    </div>
  )
}
