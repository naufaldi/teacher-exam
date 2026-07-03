import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import type {
  CurriculumCatalogResponse,
  ExamSubject,
  ExamType,
  Grade,
  PdfUploadId,
  PdfUploadSummary,
  SourceMode,
  TemplateApplyResponse
} from "@teacher-exam/shared"
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileUpload,
  Input,
  Label,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea
} from "@teacher-exam/ui"
import { Either } from "effect"
import { AlertTriangle, ArrowLeft, FileText, Lock, Sparkles, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FokusGuruChips } from "../components/generate/fokus-guru-chips.js"
import { GenerateErrorDialog } from "../components/generate/generate-error-dialog.js"
import { GenerateProgressDialog } from "../components/generate/generate-progress-dialog.js"
import { PdfLibraryPicker } from "../components/generate/pdf-library-picker.js"
import { SectionHeader } from "../components/generate/section-header.js"
import { TopicMultiSelect } from "../components/generate/topic-multi-select.js"
import { api, ApiError, RateLimitedError, unwrapApiEither } from "../lib/api.js"
import { fetchBabTopicLabels } from "../lib/curriculum-bab-topics.js"
import {
  formatSubjectGradeOptionLabel,
  readySubjectsForGrade,
  subjectOptionsForGrade
} from "../lib/curriculum-catalog.js"
import {
  type Composition,
  DEFAULT_COMPOSITION_BY_JENIS,
  DEFAULT_TOTAL_SOAL,
  EXAM_TYPE_LABEL_MAP,
  EXAM_TYPE_OPTIONS,
  FALLBACK_GENERATE_GRADES,
  FOKUS_GURU_MAX,
  FREE_TOPIC_REQUIRED_MESSAGE,
  GENERATE_DURATION_MS,
  KESULITAN_LABELS,
  PDF_REQUIRED_MESSAGE,
  rescaleComposition,
  REVIEW_MODE_LABELS,
  SOURCE_MODE_LABELS
} from "../lib/generate-exam-config.js"
import { parseGrade, phaseCopyForGrade, phaseLabelForGrade } from "../lib/phase-copy.js"
import { subjectMetaFor } from "../lib/subjects.js"

export const Route = createFileRoute("/_auth/generate")({
  component: GeneratePage,
  validateSearch: (search): { simulate?: "error"; examId?: string } => {
    const result: { simulate?: "error"; examId?: string } = {}
    if (search["simulate"] === "error") result.simulate = "error"
    if (typeof search["examId"] === "string") result.examId = search["examId"]
    return result
  }
})

// ── Main component ────────────────────────────────────────────────────────────

function GeneratePage() {
  const navigate = useNavigate()
  const { simulate } = Route.useSearch()

  // Form state
  const [sourceMode, setSourceMode] = useState<SourceMode>("default")
  const [freeTopic, setFreeTopic] = useState<string>("")
  const [uploadedPdfId, setUploadedPdfId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfSource, setPdfSource] = useState<"upload" | "library">("upload")
  const [libraryItems, setLibraryItems] = useState<Array<PdfUploadSummary>>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [selectedLibraryPdf, setSelectedLibraryPdf] = useState<PdfUploadSummary | null>(null)
  const [includePdfImages, setIncludePdfImages] = useState(false)
  const [streamQuestionsCount, setStreamQuestionsCount] = useState<number | null>(null)
  const [kelas, setKelas] = useState<string>("")
  const [mapel, setMapel] = useState<ExamSubject>("bahasa_indonesia")
  const [customMapel, setCustomMapel] = useState<string>("")
  const [topiks, setTopiks] = useState<Array<string>>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customTopik, setCustomTopik] = useState<string>("")
  const [kesulitan, setKesulitan] = useState<string>("campuran")
  const [examType, setExamType] = useState<ExamType>("formatif")
  const [totalSoal, setTotalSoal] = useState<number>(DEFAULT_TOTAL_SOAL["formatif"] ?? 20)
  const [totalSoalError, setTotalSoalError] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState<"fast" | "slow">("fast")
  const [fokusGuru, setFokusGuru] = useState<string>("")
  const [contohSoal, setContohSoal] = useState<string>("")
  const [composition, setComposition] = useState<Composition>(() => DEFAULT_COMPOSITION_BY_JENIS["formatif"])
  const [compExpanded, setCompExpanded] = useState(false)
  const [curriculumCatalog, setCurriculumCatalog] = useState<CurriculumCatalogResponse>([])
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading")
  const [babTopicOptions, setBabTopicOptions] = useState<Array<string>>([])
  const [babTopicsStatus, setBabTopicsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")

  const fokusGuruRef = useRef<HTMLTextAreaElement | null>(null)

  // Loading / error state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [generateErrorMessage, setGenerateErrorMessage] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ pdf?: string; freeTopic?: string; mapel?: string }>({})
  const [pendingDeleteId, setPendingDeleteId] = useState<PdfUploadId | null>(null)
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState<string>("")

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleJenisChange = useCallback((next: ExamType) => {
    setExamType(next)
    setTotalSoal(DEFAULT_TOTAL_SOAL[next] ?? 20)
    setTotalSoalError(null)
    setComposition(DEFAULT_COMPOSITION_BY_JENIS[next])
  }, [])

  const clearTimers = useCallback(() => {
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (completionTimerRef.current !== null) {
      clearTimeout(completionTimerRef.current)
      completionTimerRef.current = null
    }
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return clearTimers
  }, [clearTimers])

  // Prefill from a template applied via router navigation state (see /templates).
  const location = useLocation()
  const appliedTemplate = (location.state as { templateApply?: TemplateApplyResponse } | null)?.templateApply ?? null
  useEffect(() => {
    if (!appliedTemplate) return
    const t = appliedTemplate
    setMapel(t.subject)
    setKelas(String(t.grade))
    setKesulitan(t.difficulty)
    setReviewMode(t.reviewMode)
    if (t.examType !== undefined) {
      handleJenisChange(t.examType)
    }
    if (t.totalSoal !== undefined) {
      setTotalSoal(t.totalSoal)
    }
    if (t.composition !== undefined) {
      setComposition(t.composition)
    }
    if (t.topics.length > 0) {
      setTopiks([...t.topics])
    }
    if (t.classContext !== undefined) {
      setFokusGuru(t.classContext)
    }
    if (t.exampleQuestions !== undefined) {
      setContohSoal(t.exampleQuestions)
    }
  }, [])

  const selectedGrade = parseGrade(kelas)
  const phaseCopy = phaseCopyForGrade(selectedGrade)
  const phaseLabel = phaseLabelForGrade(selectedGrade)
  const readySubjectOptions = useMemo(
    () => readySubjectsForGrade(curriculumCatalog, selectedGrade),
    [curriculumCatalog, selectedGrade]
  )
  const subjectGradeOptions = useMemo(
    () => subjectOptionsForGrade(curriculumCatalog, selectedGrade),
    [curriculumCatalog, selectedGrade]
  )
  const gradeOptions = useMemo(() => {
    if (catalogStatus !== "ready") return FALLBACK_GENERATE_GRADES
    const grades = Array.from(
      new Set(curriculumCatalog.flatMap((item) => item.grades.map((entry) => entry.grade)))
    ).sort((a, b) => a - b)
    return grades.length > 0 ? grades : FALLBACK_GENERATE_GRADES
  }, [catalogStatus, curriculumCatalog])
  const selectedSubjectOption = subjectGradeOptions.find((subject) => subject.value === mapel)
  const selectedSubjectReady = selectedSubjectOption?.availability === "ready"
  const isPdfGuruMode = sourceMode === "pdf_guru"
  const displaySubjectMeta = isPdfGuruMode
    ? {
      label: customMapel.trim() || "Mata Pelajaran",
      short: customMapel.trim() || "—",
      badgeVariant: "secondary" as const
    }
    : subjectMetaFor(selectedSubjectReady ? mapel : readySubjectOptions[0]?.value ?? mapel)
  const subjectMeta = displaySubjectMeta

  useEffect(() => {
    let cancelled = false

    void api.curriculum.catalog().then((result) => {
      const catalog = unwrapApiEither(result)
      if (cancelled) return
      setCurriculumCatalog([...catalog])
      setCatalogStatus("ready")
    }).catch(() => {
      if (cancelled) return
      setCurriculumCatalog([])
      setCatalogStatus("error")
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (selectedGrade === undefined || catalogStatus !== "ready") return
    const firstReadySubject = readySubjectOptions[0]
    if (firstReadySubject !== undefined && !selectedSubjectReady) {
      setMapel(firstReadySubject.value)
      setTopiks([])
      setCustomTopik("")
      setShowCustomInput(false)
    }
  }, [catalogStatus, readySubjectOptions, selectedGrade, selectedSubjectReady])

  useEffect(() => {
    if (selectedGrade === undefined || !selectedSubjectReady || catalogStatus !== "ready") {
      setBabTopicOptions([])
      setBabTopicsStatus("idle")
      return
    }

    let cancelled = false
    setBabTopicsStatus("loading")

    void fetchBabTopicLabels(mapel, selectedGrade).then((labels) => {
      if (cancelled) return
      setBabTopicOptions(labels)
      setBabTopicsStatus("ready")
    }).catch(() => {
      if (cancelled) return
      setBabTopicOptions([])
      setBabTopicsStatus("error")
    })

    return () => {
      cancelled = true
    }
  }, [catalogStatus, mapel, selectedGrade, selectedSubjectReady])

  // Effective topics array for submission
  const effectiveTopiks: Array<string> = showCustomInput && customTopik.trim() !== ""
    ? [...topiks, customTopik.trim()]
    : topiks

  const showPdfControls = sourceMode === "pdf_guru" || sourceMode === "combine"
  const babRequired = sourceMode === "default" || sourceMode === "combine"
  const topicsSatisfied = babRequired
    ? effectiveTopiks.length > 0
    : sourceMode === "pdf_guru"
    ? freeTopic.trim().length >= 10
    : true
  const pdfSatisfied = !showPdfControls ||
    selectedFile !== null ||
    uploadedPdfId !== null ||
    selectedLibraryPdf?.status === "ready"

  useEffect(() => {
    if (!showPdfControls || pdfSource !== "library") return
    let cancelled = false

    const loadLibrary = () => {
      setLibraryLoading(true)
      void api.pdfUploads.list().then((result) => {
        if (cancelled) return
        if (Either.isRight(result)) {
          setLibraryItems([...result.right.items])
        } else {
          setLibraryItems([])
        }
        setLibraryLoading(false)
      })
    }

    loadLibrary()
    return () => {
      cancelled = true
    }
  }, [showPdfControls, pdfSource])

  const libraryHasPending = libraryItems.some(
    (item) => item.status === "processing" || item.status === "uploaded"
  )

  useEffect(() => {
    if (!showPdfControls || pdfSource !== "library" || !libraryHasPending) return
    const handle = setInterval(() => {
      void api.pdfUploads.list().then((result) => {
        if (Either.isRight(result)) {
          setLibraryItems([...result.right.items])
        }
      })
    }, 2000)
    return () => clearInterval(handle)
  }, [libraryHasPending, pdfSource, showPdfControls])

  const filledCount = [
    kelas,
    mapel,
    topicsSatisfied ? "ok" : "",
    kesulitan,
    examType,
    ...(showPdfControls && pdfSatisfied ? ["pdf"] : [])
  ].filter(Boolean).length

  const handleSourceModeChange = useCallback((next: SourceMode) => {
    setSourceMode(next)
    setFieldErrors({})
    if (next === "default") {
      setSelectedFile(null)
      setUploadedPdfId(null)
      setFreeTopic("")
      setCustomMapel("")
      setSelectedLibraryPdf(null)
      setIncludePdfImages(false)
      setPdfSource("upload")
    } else if (next !== "pdf_guru") {
      setCustomMapel("")
    } else {
      setTopiks([])
      setCustomTopik("")
      setShowCustomInput(false)
    }
  }, [])

  const runGenerate = useCallback(() => {
    const topics: Array<string> = showCustomInput && customTopik.trim() !== ""
      ? [...topiks, customTopik.trim()]
      : topiks

    const submitTopics = sourceMode === "pdf_guru"
      ? (topics.length > 0 ? topics : [freeTopic.trim()])
      : topics

    setError(null)
    setGenerateErrorMessage(null)
    setShowErrorDialog(false)
    setIsGenerating(true)
    setProgress(0)

    const startedAt = Date.now()

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const ratio = Math.min(1, elapsed / GENERATE_DURATION_MS)
      const eased = 1 - Math.pow(1 - ratio, 1.6)
      setProgress(Math.min(eased * 100, 99))
    }, 120)

    const pollGenerateStream = (examId: string) => {
      const poll = () => {
        void api.exams.pollGenerateStream(examId).then((streamResult) => {
          if (!Either.isRight(streamResult)) return
          const payload = streamResult.right
          setStreamQuestionsCount(payload.questionsCount)
          const ratio = payload.targetCount > 0 ? payload.questionsCount / payload.targetCount : 0
          setProgress(Math.min(99, Math.max(5, ratio * 100)))
          if (payload.done) {
            clearTimers()
            setProgress(100)
            completionTimerRef.current = setTimeout(() => {
              setIsGenerating(false)
              void navigate({
                to: "/review",
                search: { examId, mode: reviewMode, from: "generate" }
              })
            }, 450)
            return
          }
          pollTimerRef.current = setTimeout(poll, 1000)
        })
      }
      poll()
    }

    const startGenerate = (pdfUploadId?: string) => {
      void api.ai.generate({
        sourceMode,
        ...(sourceMode === "pdf_guru"
          ? { subjectLabel: customMapel.trim() }
          : { subject: mapel }),
        grade: Number(kelas) as Grade,
        difficulty: kesulitan as "mudah" | "sedang" | "sulit" | "campuran",
        topics: submitTopics,
        reviewMode,
        examType,
        totalSoal,
        composition,
        asyncJob: import.meta.env["VITE_ASYNC_GENERATE"] === "true",
        classContext: fokusGuru.trim() !== "" ? fokusGuru.trim() : undefined,
        exampleQuestions: contohSoal.trim() !== "" ? contohSoal.trim() : undefined,
        ...(sourceMode === "pdf_guru" && freeTopic.trim() !== "" ? { freeTopic: freeTopic.trim() } : {}),
        ...(showPdfControls && includePdfImages ? { includePdfImages: true } : {}),
        ...(pdfUploadId !== undefined ? { pdfUploadId: pdfUploadId as PdfUploadId } : {})
      }).then((result) => {
        const payload = unwrapApiEither(result)
        if (payload.kind === "sync") {
          clearTimers()
          setProgress(100)
          completionTimerRef.current = setTimeout(() => {
            setIsGenerating(false)
            void navigate({
              to: "/review",
              search: { examId: payload.exam.id, mode: reviewMode, from: "generate" }
            })
          }, 450)
          return
        }
        setStreamQuestionsCount(0)
        pollGenerateStream(payload.examId)
      }).catch((err: unknown) => {
        clearTimers()
        setIsGenerating(false)
        setProgress(0)

        if (err instanceof RateLimitedError) {
          const message = `Terlalu banyak permintaan. Coba lagi dalam ${err.retryAfterSec} detik.`
          setError(message)
          setGenerateErrorMessage(message)
          setShowErrorDialog(true)
        } else if (err instanceof ApiError) {
          setGenerateErrorMessage(err.message)
          setShowErrorDialog(true)
        } else {
          setShowErrorDialog(true)
        }
      })
    }

    if (showPdfControls && selectedFile !== null) {
      void api.pdfUploads.create(selectedFile).then((uploadResult) => {
        const upload = unwrapApiEither(uploadResult)
        setUploadedPdfId(upload.id)
        startGenerate(upload.id)
      }).catch((err: unknown) => {
        clearTimers()
        setIsGenerating(false)
        setProgress(0)
        if (err instanceof ApiError) {
          setGenerateErrorMessage(err.message)
        }
        setShowErrorDialog(true)
      })
      return
    }

    if (showPdfControls && selectedLibraryPdf?.status === "ready") {
      startGenerate(selectedLibraryPdf.id)
      return
    }

    if (showPdfControls && uploadedPdfId !== null) {
      startGenerate(uploadedPdfId)
      return
    }

    startGenerate()
  }, [
    clearTimers,
    composition,
    contohSoal,
    customTopik,
    examType,
    customMapel,
    fokusGuru,
    freeTopic,
    kelas,
    kesulitan,
    mapel,
    navigate,
    reviewMode,
    selectedFile,
    showCustomInput,
    selectedLibraryPdf,
    showPdfControls,
    sourceMode,
    topiks,
    totalSoal,
    uploadedPdfId
  ])

  const selectedPdfLabel = selectedFile?.name ?? selectedLibraryPdf?.filename ?? null

  const handleGenerate = () => {
    const nextErrors: { pdf?: string; freeTopic?: string; mapel?: string } = {}
    if (showPdfControls && !pdfSatisfied) {
      nextErrors.pdf = PDF_REQUIRED_MESSAGE
    }
    if (sourceMode === "pdf_guru" && freeTopic.trim().length < 10) {
      nextErrors.freeTopic = FREE_TOPIC_REQUIRED_MESSAGE
    }
    if (sourceMode === "pdf_guru" && customMapel.trim().length < 2) {
      nextErrors.mapel = "Mata pelajaran wajib diisi (minimal 2 karakter)."
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setFieldErrors({})
    runGenerate()
  }

  const handleRetry = () => {
    setShowErrorDialog(false)
    setGenerateErrorMessage(null)
    runGenerate()
  }

  const compositionSum = composition.mcqSingle + composition.mcqMulti + composition.trueFalse
  const isCompositionValid = compositionSum === totalSoal
  const mapelSatisfied = sourceMode === "pdf_guru"
    ? customMapel.trim().length >= 2
    : Boolean(mapel && selectedSubjectReady)
  const coreFormReady = Boolean(
    kelas && mapelSatisfied && kesulitan && !isGenerating && totalSoalError === null &&
      isCompositionValid &&
      (sourceMode === "pdf_guru" || (catalogStatus === "ready" && selectedSubjectReady))
  )
  const isGenerateDisabled = Boolean(
    !coreFormReady || (babRequired && effectiveTopiks.length === 0)
  )

  const topikSummary = effectiveTopiks.join(", ")
  const sidebarMateriLabel = sourceMode === "pdf_guru"
    ? (effectiveTopiks.length > 0 ? topikSummary : freeTopic.trim() || "—")
    : (effectiveTopiks.length > 0 ? topikSummary : "—")

  return (
    <div className="grid md:grid-cols-[1fr_340px] gap-8">
      {/* ── Left column: Hero + Form ────────────────────────────────────── */}
      <div className="space-y-6">
        {/* ── Hero section ── */}
        <section
          className="animate-fade-up-stagger"
          style={{ "--index": 0 } as React.CSSProperties}
        >
          <div className="relative overflow-hidden rounded-lg border border-border-default bg-white p-7">
            {/* Subtle red radial wash */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(ellipse 1200px 360px at -10% -40%, rgba(180,35,24,0.07), transparent 60%)"
              }}
            />

            <div className="relative">
              {/* Back button */}
              <button
                onClick={() => void navigate({ to: "/dashboard" })}
                className="flex items-center gap-1.5 mb-4 text-body-sm text-text-tertiary hover:text-text-primary transition-colors duration-[120ms]"
              >
                <ArrowLeft size={15} />
                Kembali ke Dashboard
              </button>

              {/* Icon + title row */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-[12px] bg-primary-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h1 className="text-h1 font-bold text-text-primary leading-tight">
                    Generate Lembar (AI)
                  </h1>
                  <p className="text-body text-text-tertiary mt-0.5">
                    1 lembar = {totalSoal} soal pilihan ganda
                  </p>
                </div>
              </div>

              {/* Reactive badge chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="pill">
                  <Lock size={11} />
                  Kurikulum Merdeka · {phaseLabel}
                </Badge>
                <Badge variant={subjectMeta.badgeVariant}>{subjectMeta.label}</Badge>
                <Badge variant="secondary">{EXAM_TYPE_LABEL_MAP[examType]}</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* ── Form sections ── */}
        <div className="relative space-y-8">
          {/* Section A: Materi Ujian */}
          <section
            className="animate-fade-up-stagger space-y-5"
            style={{ "--index": 1 } as React.CSSProperties}
          >
            <SectionHeader label="Materi Ujian" />

            <div className="space-y-2">
              <Label>Sumber materi</Label>
              <RadioGroup
                value={sourceMode}
                onValueChange={(value) => handleSourceModeChange(value as SourceMode)}
                className="grid gap-2"
              >
                <label className="flex items-center gap-2 rounded-md border border-border-default px-3 py-2 cursor-pointer">
                  <RadioGroupItem value="default" id="source-default" />
                  <span className="text-body-sm">Buku Siswa</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border border-border-default px-3 py-2 cursor-pointer">
                  <RadioGroupItem value="pdf_guru" id="source-pdf-guru" />
                  <span className="text-body-sm">PDF saya saja</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border border-border-default px-3 py-2 cursor-pointer">
                  <RadioGroupItem value="combine" id="source-combine" />
                  <span className="text-body-sm">Buku Siswa + PDF saya</span>
                </label>
              </RadioGroup>
            </div>

            {sourceMode === "pdf_guru" ?
              (
                <div className="flex items-start gap-2 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-body-sm text-warning-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>
                    Soal mungkin di luar Capaian Pembelajaran resmi. Gunakan Periksa kurikulum setelah generate.
                  </p>
                </div>
              ) :
              null}

            {showPdfControls ?
              (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={pdfSource === "upload" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setPdfSource("upload")}
                    >
                      Upload baru
                    </Button>
                    <Button
                      type="button"
                      variant={pdfSource === "library" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setPdfSource("library")}
                    >
                      Dari perpustakaan
                    </Button>
                  </div>
                  {pdfSource === "upload" ?
                    (
                      <FileUpload
                        onFileSelect={(file) => {
                          setSelectedFile(file)
                          setUploadedPdfId(null)
                          setSelectedLibraryPdf(null)
                          setFieldErrors((prev) => {
                            const next = { ...prev }
                            delete next.pdf
                            return next
                          })
                        }}
                        onFileRemove={() => {
                          setSelectedFile(null)
                          setUploadedPdfId(null)
                        }}
                        selectedFile={selectedFile}
                      />
                    ) :
                    (
                      <PdfLibraryPicker
                        items={libraryItems}
                        loading={libraryLoading}
                        selectedId={selectedLibraryPdf?.id ?? null}
                        onSelect={(item) => {
                          setSelectedLibraryPdf(item)
                          setSelectedFile(null)
                          setUploadedPdfId(item.id)
                          setFieldErrors((prev) => {
                            const next = { ...prev }
                            delete next.pdf
                            return next
                          })
                        }}
                        onDelete={(id) => {
                          const item = libraryItems.find((entry) => entry.id === id)
                          setPendingDeleteId(id)
                          setPendingDeleteFilename(item?.filename ?? "PDF")
                        }}
                      />
                    )}
                  {(selectedFile !== null || selectedLibraryPdf !== null || uploadedPdfId !== null) ?
                    (
                      <label className="flex items-center gap-2 text-body-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border-ui"
                          checked={includePdfImages}
                          onChange={(event) => setIncludePdfImages(event.target.checked)}
                        />
                        Sertakan gambar dari PDF (maks. ~30% soal)
                      </label>
                    ) :
                    null}
                  {fieldErrors.pdf !== undefined ?
                    (
                      <p className="text-caption text-danger-fg" role="alert">
                        {fieldErrors.pdf}
                      </p>
                    ) :
                    null}
                </div>
              ) :
              null}

            {sourceMode === "pdf_guru" ?
              (
                <div className="space-y-1.5">
                  <Label htmlFor="free-topic">Topik bebas</Label>
                  <Textarea
                    id="free-topic"
                    value={freeTopic}
                    onChange={(e) => {
                      setFreeTopic(e.target.value)
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.freeTopic
                        return next
                      })
                    }}
                    placeholder="Contoh: Ekosistem dan pencemaran lingkungan di sekitar sekolah"
                    rows={3}
                  />
                  <p className="text-caption text-text-tertiary">Wajib diisi, minimal 10 karakter.</p>
                  {fieldErrors.freeTopic !== undefined ?
                    (
                      <p className="text-caption text-danger-fg" role="alert">
                        {fieldErrors.freeTopic}
                      </p>
                    ) :
                    null}
                </div>
              ) :
              null}

            {/* Kelas */}
            <div className="space-y-1.5">
              <Label htmlFor="kelas">Kelas</Label>
              <Select
                value={kelas}
                onValueChange={(v) => {
                  setKelas(v)
                  setTopiks([])
                  setCustomTopik("")
                  setShowCustomInput(false)
                }}
              >
                <SelectTrigger id="kelas">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={String(grade)}>Kelas {grade} SD</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kurikulum (locked) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="kurikulum">Kurikulum</Label>
                <Lock className="h-3.5 w-3.5 text-text-tertiary" />
              </div>
              <Select disabled defaultValue="merdeka">
                <SelectTrigger id="kurikulum">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merdeka">Kurikulum Merdeka</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-caption text-text-tertiary mt-1">{phaseCopy}</p>
            </div>

            {/* Mata Pelajaran */}
            <div className="space-y-1.5">
              <Label htmlFor="mapel">Mata Pelajaran</Label>
              {sourceMode === "pdf_guru" ?
                (
                  <>
                    <Input
                      id="mapel"
                      value={customMapel}
                      onChange={(event) => setCustomMapel(event.target.value)}
                      placeholder="Contoh: Seni Budaya, PJOK, Matematika"
                    />
                    <p className="text-caption text-text-tertiary">
                      Nama bebas sesuai materi PDF Anda — tidak terikat daftar mapel Buku Siswa.
                    </p>
                    {fieldErrors.mapel ?
                      <p className="text-caption text-danger-600">{fieldErrors.mapel}</p> :
                      null}
                  </>
                ) :
                (
                  <>
                    <Select
                      value={mapel}
                      disabled={kelas === "" || catalogStatus !== "ready" || subjectGradeOptions.length === 0}
                      onValueChange={(v) => {
                        const nextSubject = subjectGradeOptions.find((subject) => subject.value === v)
                        if (nextSubject?.availability !== "ready") return
                        setMapel(v as ExamSubject)
                        setTopiks([])
                        setCustomTopik("")
                        setShowCustomInput(false)
                      }}
                    >
                      <SelectTrigger id="mapel">
                        <SelectValue
                          placeholder={kelas === "" ? "Pilih kelas dulu" : "Pilih mata pelajaran"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectGradeOptions.map((subject) => (
                          <SelectItem
                            key={subject.value}
                            value={subject.value}
                            disabled={subject.availability !== "ready"}
                          >
                            {formatSubjectGradeOptionLabel(subject)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {kelas === "" ?
                      (
                        <p className="text-caption text-text-tertiary">
                          Pilih kelas dulu untuk melihat mata pelajaran siap generate.
                        </p>
                      ) :
                      null}
                    {kelas !== "" && catalogStatus === "loading" ?
                      <p className="text-caption text-text-tertiary">Memuat daftar materi siap generate...</p> :
                      null}
                    {kelas !== "" && catalogStatus === "error" ?
                      <p className="text-caption text-danger-600">Daftar materi siap generate gagal dimuat.</p> :
                      null}
                    {kelas !== "" && catalogStatus === "ready" && readySubjectOptions.length === 0 ?
                      (
                        <p className="text-caption text-warning-fg">
                          Belum ada mata pelajaran siap generate untuk kelas ini. Pilihan di atas menunjukkan status
                          ketersediaan.
                        </p>
                      ) :
                      null}
                    {selectedSubjectOption?.optional === true && selectedSubjectReady ?
                      (
                        <p className="text-caption text-text-tertiary">
                          Mata pelajaran opsional — kebijakan sekolah dapat mempengaruhi penggunaan di kelas ini.
                        </p>
                      ) :
                      null}
                  </>
                )}
            </div>

            {/* Materi */}
            {babRequired ?
              (
                <div className="space-y-2">
                  <Label>Materi</Label>
                  <div className={kelas === "" ? "pointer-events-none opacity-60" : undefined}>
                    <TopicMultiSelect
                      options={babTopicOptions}
                      selected={topiks}
                      onChange={setTopiks}
                      onCustom={() => setShowCustomInput(true)}
                      maxItems={8}
                      placeholder={kelas === "" ?
                        "Pilih kelas dulu" :
                        babTopicsStatus === "loading" ?
                        "Memuat daftar Bab..." :
                        "Pilih 1–8 materi Bab..."}
                    />
                  </div>
                  {kelas === "" ?
                    <p className="text-caption text-text-tertiary">Pilih kelas dulu untuk melihat materi Bab.</p> :
                    null}
                  {kelas !== "" && babTopicsStatus === "loading" ?
                    <p className="text-caption text-text-tertiary">Memuat daftar Bab...</p> :
                    null}
                  {kelas !== "" && babTopicsStatus === "error" ?
                    <p className="text-caption text-danger-600">Daftar materi Bab gagal dimuat.</p> :
                    null}
                  {kelas !== "" && babTopicsStatus === "ready" && babTopicOptions.length === 0 ?
                    <p className="text-caption text-warning-fg">Materi belum tersedia untuk kelas ini.</p> :
                    null}
                  {showCustomInput ?
                    (
                      <div className="flex gap-2 mt-2 items-center">
                        <Input
                          placeholder="Ketik topik kustom..."
                          value={customTopik}
                          onChange={(e) => setCustomTopik(e.target.value)}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          className="text-text-tertiary hover:text-danger-600 p-1"
                          onClick={() => {
                            setShowCustomInput(false)
                            setCustomTopik("")
                          }}
                          aria-label="Batalkan topik kustom"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) :
                    null}
                  {babRequired && effectiveTopiks.length === 0 ?
                    <p className="text-caption text-text-tertiary">Pilih minimal 1 materi.</p> :
                    null}
                </div>
              ) :
              null}
          </section>

          {/* Section B: Pengaturan Soal */}
          <section
            className="animate-fade-up-stagger space-y-5"
            style={{ "--index": 2 } as React.CSSProperties}
          >
            <SectionHeader label="Pengaturan Soal" />

            {/* Jenis Lembar (PRD §8.6) */}
            <div className="space-y-1.5">
              <Label>Jenis Lembar</Label>
              <RadioGroup
                value={examType}
                onValueChange={(v) => handleJenisChange(v as ExamType)}
              >
                <div className="grid grid-cols-2 gap-3">
                  {EXAM_TYPE_OPTIONS.map((opt) => {
                    const id = `jenis-${opt.value}`
                    const selected = examType === opt.value
                    return (
                      <Label
                        key={opt.value}
                        htmlFor={id}
                        title={opt.sublabel}
                        className={[
                          "flex flex-col gap-1 p-3 rounded-sm border cursor-pointer",
                          "transition-all duration-[180ms]",
                          selected
                            ? "border-primary-600 bg-primary-50"
                            : "border-border-ui bg-bg-surface hover:bg-bg-muted hover:-translate-y-0.5 hover:shadow-md"
                        ].join(" ")}
                      >
                        <RadioGroupItem
                          value={opt.value}
                          id={id}
                          className="sr-only"
                        />
                        <span className="text-body font-medium text-text-primary">
                          {opt.label}
                        </span>
                        <span className="text-caption text-text-tertiary">
                          {opt.sublabel}
                        </span>
                      </Label>
                    )
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Tingkat Kesulitan */}
            <div className="space-y-1.5">
              <Label htmlFor="kesulitan">Tingkat Kesulitan</Label>
              <Select value={kesulitan} onValueChange={setKesulitan}>
                <SelectTrigger id="kesulitan">
                  <SelectValue placeholder="Pilih kesulitan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mudah">Mudah</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="sulit">Sulit</SelectItem>
                  <SelectItem value="campuran">Campuran</SelectItem>
                </SelectContent>
              </Select>
              {kesulitan === "campuran" ?
                (
                  <p className="text-caption text-text-tertiary mt-1">
                    Distribusi kesulitan mengikuti Jenis Lembar terpilih.
                  </p>
                ) :
                (
                  <p className="text-caption text-text-tertiary mt-1">
                    Pilihan eksplisit ini akan menggantikan distribusi default Jenis Lembar.
                  </p>
                )}
            </div>

            {/* Jumlah Soal (editable — PRD US-8) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalSoal">Jumlah Soal</Label>
              <Input
                id="totalSoal"
                type="number"
                min={5}
                max={50}
                value={totalSoal}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  const oldTotal = DEFAULT_TOTAL_SOAL[examType] ?? 20
                  setTotalSoal(n)
                  if (!Number.isInteger(n) || n < 5) setTotalSoalError("Minimum 5 soal")
                  else if (n > 50) setTotalSoalError("Maksimum 50 soal")
                  else {
                    setTotalSoalError(null)
                    if (n > 0) {
                      setComposition(rescaleComposition(DEFAULT_COMPOSITION_BY_JENIS[examType], oldTotal, n))
                    }
                  }
                }}
                aria-invalid={totalSoalError !== null}
                aria-describedby={totalSoalError !== null ? "totalSoal-error" : undefined}
              />
              {totalSoalError !== null ?
                <p id="totalSoal-error" className="text-danger-600 text-sm">{totalSoalError}</p> :
                null}
            </div>

            {/* Atur Komposisi expandable panel */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={compExpanded}
                onClick={() => setCompExpanded((prev) => !prev)}
                className="flex items-center gap-2 text-body-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-[120ms] self-start"
              >
                Atur komposisi
                <span className="text-caption text-text-tertiary">{compExpanded ? "▲" : "▼"}</span>
              </button>
              {compExpanded ?
                (
                  <div className="flex flex-col gap-3 pl-2 border-l-2 border-border-default">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="comp-mcq-single">PG Pilihan Tunggal</Label>
                      <Input
                        id="comp-mcq-single"
                        type="number"
                        min={0}
                        value={composition.mcqSingle}
                        onChange={(e) =>
                          setComposition((prev) => ({ ...prev, mcqSingle: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="comp-mcq-multi">PG Pilihan Jamak</Label>
                      <Input
                        id="comp-mcq-multi"
                        type="number"
                        min={0}
                        value={composition.mcqMulti}
                        onChange={(e) => setComposition((prev) => ({ ...prev, mcqMulti: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="comp-true-false">Benar/Salah</Label>
                      <Input
                        id="comp-true-false"
                        type="number"
                        min={0}
                        value={composition.trueFalse}
                        onChange={(e) =>
                          setComposition((prev) => ({ ...prev, trueFalse: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    {!isCompositionValid ?
                      <p className="text-danger-600 text-sm">Total harus sama dengan {totalSoal}</p> :
                      null}
                  </div>
                ) :
                null}
            </div>

            {/* Mode Review */}
            <div className="space-y-1.5">
              <Label>Mode Review</Label>
              <RadioGroup
                value={reviewMode}
                onValueChange={(v) => setReviewMode(v as "fast" | "slow")}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Label
                    htmlFor="mode-fast"
                    className={[
                      "flex flex-col gap-1 p-4 rounded-sm border cursor-pointer",
                      "transition-all duration-[180ms]",
                      reviewMode === "fast"
                        ? "border-primary-600 bg-primary-50"
                        : "border-border-ui bg-bg-surface hover:bg-bg-muted hover:-translate-y-0.5 hover:shadow-md"
                    ].join(" ")}
                  >
                    <RadioGroupItem value="fast" id="mode-fast" className="sr-only" />
                    <span className="text-body font-medium text-text-primary">Cepat</span>
                    <span className="text-body-sm text-text-tertiary">Auto-terima {totalSoal} soal</span>
                  </Label>
                  <Label
                    htmlFor="mode-slow"
                    className={[
                      "flex flex-col gap-1 p-4 rounded-sm border cursor-pointer",
                      "transition-all duration-[180ms]",
                      reviewMode === "slow"
                        ? "border-primary-600 bg-primary-50"
                        : "border-border-ui bg-bg-surface hover:bg-bg-muted hover:-translate-y-0.5 hover:shadow-md"
                    ].join(" ")}
                  >
                    <RadioGroupItem value="slow" id="mode-slow" className="sr-only" />
                    <span className="text-body font-medium text-text-primary">Detail</span>
                    <span className="text-body-sm text-text-tertiary">Review satu per satu</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </section>

          {/* Section C: Konteks & Referensi (PRD §8.7) */}
          <section
            className="animate-fade-up-stagger space-y-5"
            style={{ "--index": 3 } as React.CSSProperties}
          >
            <SectionHeader label="Konteks & Referensi" />

            {/* Fokus / Tujuan Guru */}
            <div className="space-y-1.5">
              <Label htmlFor="fokus-guru">
                Fokus / Tujuan Guru <span className="text-text-tertiary font-normal">(opsional)</span>
              </Label>
              <Textarea
                ref={fokusGuruRef}
                id="fokus-guru"
                placeholder="Mis. Anak-anak masih bingung bedakan teks persuasi vs eksposisi. Beri lebih banyak soal yang minta identifikasi ciri kalimat ajakan."
                rows={3}
                value={fokusGuru}
                onChange={(e) => setFokusGuru(e.target.value.slice(0, FOKUS_GURU_MAX))}
              />
              <FokusGuruChips
                topik={effectiveTopiks[0] ?? ""}
                onAppend={(snippet) => {
                  setFokusGuru((prev) => {
                    const sep = prev.length === 0 || prev.endsWith("\n") ? "" : "\n"
                    const next = (prev + sep + snippet).slice(0, FOKUS_GURU_MAX)
                    // Restore focus + caret to the end after state flush
                    queueMicrotask(() => {
                      const el = fokusGuruRef.current
                      if (el) {
                        el.focus()
                        el.setSelectionRange(next.length, next.length)
                      }
                    })
                    return next
                  })
                }}
              />
              <div className="flex justify-between items-center">
                <p className="text-caption text-text-tertiary">
                  Konteks ini diberikan ke AI sebagai panduan, tidak dicetak di lembar siswa.
                </p>
                <span
                  className={[
                    "text-caption tabular-nums",
                    fokusGuru.length >= FOKUS_GURU_MAX
                      ? "text-warning-fg"
                      : "text-text-tertiary"
                  ].join(" ")}
                >
                  {fokusGuru.length}/{FOKUS_GURU_MAX}
                </span>
              </div>
            </div>

            {/* Contoh Soal */}
            <div className="space-y-1.5">
              <Label htmlFor="contoh-soal">
                Contoh Soal <span className="text-text-tertiary font-normal">(opsional)</span>
              </Label>
              <Textarea
                id="contoh-soal"
                placeholder="Paste contoh soal yang diinginkan gayanya..."
                rows={4}
                value={contohSoal}
                onChange={(e) => setContohSoal(e.target.value)}
              />
            </div>
          </section>

          {/* CTA area */}
          <section
            className="animate-fade-up-stagger pt-2"
            style={{ "--index": 4 } as React.CSSProperties}
          >
            {/* Error alert */}
            {error !== null ?
              (
                <div className="flex items-start gap-3 p-3 rounded-sm bg-danger-bg border border-danger-border mb-4">
                  <AlertTriangle size={16} className="text-danger-fg shrink-0 mt-0.5" />
                  <p className="flex-1 text-body-sm text-danger-fg font-medium">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="shrink-0 text-danger-fg hover:text-text-primary transition-colors duration-[120ms]"
                    aria-label="Tutup pesan error"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) :
              null}

            {simulate === "error" ?
              (
                <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-sm bg-warning-bg border border-warning-border text-caption text-warning-fg">
                  <AlertTriangle size={13} />
                  Mode simulasi error aktif (?simulate=error)
                </div>
              ) :
              null}

            <div className="pt-4 border-t border-border-default">
              <Button
                size="lg"
                className="w-full"
                disabled={isGenerateDisabled}
                onClick={handleGenerate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Lembar
              </Button>
              <p className="text-caption text-text-tertiary text-center mt-2">
                AI akan membuat {totalSoal} soal sesuai Capaian Pembelajaran {phaseLabel}
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ── Right column: Sticky sidebar summary ────────────────────────── */}
      <div
        className="hidden md:block animate-fade-up-stagger"
        style={{ "--index": 5 } as React.CSSProperties}
      >
        <Card className="sticky top-[72px]" data-testid="generate-sidebar-summary">
          <CardContent className="p-6 space-y-4">
            {/* Header + completion indicator */}
            <div className="space-y-2">
              <h3 className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
                Ringkasan Konfigurasi
              </h3>
              <div className="flex items-center gap-2">
                <Progress value={filledCount * 20} className="h-1.5 flex-1" />
                <span className="text-caption text-text-tertiary tabular-nums">
                  {filledCount}/5
                </span>
              </div>
            </div>

            <Separator />

            {/* Summary rows */}
            <div className="space-y-2.5 text-body-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Kelas</span>
                <span className="text-text-primary text-right">
                  {kelas ? `Kelas ${kelas} SD` : "—"}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Mata Pelajaran</span>
                <span className="text-right">
                  <Badge variant={subjectMeta.badgeVariant} className="text-caption">
                    {sourceMode === "pdf_guru" ? (customMapel.trim() || "—") : subjectMeta.short}
                  </Badge>
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Jenis</span>
                <Badge variant="secondary" className="text-caption">
                  {EXAM_TYPE_LABEL_MAP[examType]}
                </Badge>
              </div>

              <div className="flex justify-between items-start gap-2">
                <span className="text-text-tertiary shrink-0">Materi</span>
                <span className="text-text-primary max-w-[160px] text-right">
                  {sidebarMateriLabel.length > 50
                    ? sidebarMateriLabel.slice(0, 50) + "…"
                    : sidebarMateriLabel}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Kesulitan</span>
                <span className="text-text-primary">
                  {kesulitan ? (KESULITAN_LABELS[kesulitan] ?? kesulitan) : "—"}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Sumber</span>
                <span className="text-text-primary text-right">
                  {SOURCE_MODE_LABELS[sourceMode]}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Mode</span>
                <span className="text-text-primary">
                  {REVIEW_MODE_LABELS[reviewMode] ?? reviewMode}
                </span>
              </div>

              {fokusGuru.trim() !== "" ?
                (
                  <div className="flex flex-col gap-1 pt-1 border-t border-border-default">
                    <span className="text-text-tertiary">Fokus Guru</span>
                    <span className="text-text-primary text-caption line-clamp-3 italic">
                      “{fokusGuru.trim()}”
                    </span>
                  </div>
                ) :
                null}
            </div>

            <Separator />

            {/* Fixed info row */}
            <div className="flex justify-between items-center text-body-sm">
              <span className="text-text-tertiary">Jumlah soal</span>
              <Badge variant="secondary">{totalSoal} soal</Badge>
            </div>

            {/* File indicator */}
            {selectedPdfLabel !== null ?
              (
                <div className="flex items-center gap-2 text-body-sm pt-1 border-t border-border-default">
                  <FileText size={14} className="text-text-tertiary shrink-0" />
                  <span className="text-text-secondary truncate">{selectedPdfLabel}</span>
                </div>
              ) :
              null}
          </CardContent>
        </Card>
      </div>

      {/* ── Loading + error dialogs ─────────────────────────────────────── */}
      <GenerateProgressDialog
        open={isGenerating}
        phaseLabel={phaseLabel}
        progress={progress}
        totalSoal={totalSoal}
        questionsCount={streamQuestionsCount}
      />
      <GenerateErrorDialog
        open={showErrorDialog}
        onRetry={handleRetry}
        onClose={() => {
          setShowErrorDialog(false)
          setGenerateErrorMessage(null)
        }}
        message={generateErrorMessage ?? undefined}
      />
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null)
            setPendingDeleteFilename("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus PDF dari perpustakaan?</DialogTitle>
            <DialogDescription>
              {pendingDeleteFilename} akan dihapus dari perpustakaan Anda. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPendingDeleteId(null)
                setPendingDeleteFilename("")
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (pendingDeleteId === null) return
                const id = pendingDeleteId
                setPendingDeleteId(null)
                setPendingDeleteFilename("")
                void api.pdfUploads.remove(id).then(() => {
                  setLibraryItems((items) => items.filter((item) => item.id !== id))
                  if (selectedLibraryPdf?.id === id) {
                    setSelectedLibraryPdf(null)
                    setUploadedPdfId(null)
                  }
                })
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
