import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import type {
  CurriculumCatalogResponse,
  ExamSubject,
  ExamType,
  Grade,
  PdfUploadId,
  SourceMode,
  TemplateApplyResponse
} from "@teacher-exam/shared"
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { AlertTriangle, ArrowLeft, FileText, Lock, Sparkles, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GenerateErrorDialog } from "../components/generate/generate-error-dialog.js"
import { GenerateProgressDialog } from "../components/generate/generate-progress-dialog.js"
import { TopicMultiSelect } from "../components/generate/topic-multi-select.js"
import { api, ApiError, RateLimitedError, unwrapApiEither } from "../lib/api.js"
import { fetchBabTopicLabels } from "../lib/curriculum-bab-topics.js"
import { readySubjectsForGrade } from "../lib/curriculum-catalog.js"
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

// ── Display label maps ────────────────────────────────────────────────────────

const KESULITAN_LABELS: Record<string, string> = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
  campuran: "Campuran"
}

const REVIEW_MODE_LABELS: Record<string, string> = {
  fast: "Cepat",
  slow: "Detail"
}

// ── Jenis Lembar (PRD §8.6) ──────────────────────────────────────────────────

interface ExamTypeOption {
  value: ExamType
  label: string
  sublabel: string
}

const EXAM_TYPE_OPTIONS: ReadonlyArray<ExamTypeOption> = [
  { value: "latihan", label: "Latihan Soal", sublabel: "Asesmen mandiri / drill" },
  { value: "formatif", label: "Ulangan Harian", sublabel: "Asesmen Formatif" },
  { value: "sts", label: "UTS", sublabel: "Sumatif Tengah Semester" },
  { value: "sas", label: "UAS", sublabel: "Sumatif Akhir Semester" },
  { value: "tka", label: "TKA", sublabel: "Tes Kemampuan Akademik" }
] as const

const EXAM_TYPE_LABEL_MAP: Record<ExamType, string> = Object.fromEntries(
  EXAM_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<ExamType, string>

const FOKUS_GURU_MAX = 500
const FALLBACK_GENERATE_GRADES: ReadonlyArray<Grade> = [1, 2, 3, 4, 5, 6]

// ── Default total soal per jenis (PRD §8.x) ───────────────────────────────────

const DEFAULT_TOTAL_SOAL: Record<string, number> = {
  latihan: 20,
  formatif: 20,
  sts: 25,
  sas: 25,
  tka: 25
}

// ── Default composition per jenis (Task 5 profile defaults) ──────────────────

type Composition = { mcqSingle: number; mcqMulti: number; trueFalse: number }

const DEFAULT_COMPOSITION_BY_JENIS = {
  latihan: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  formatif: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  sts: { mcqSingle: 18, mcqMulti: 4, trueFalse: 3 },
  sas: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 },
  tka: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 }
} as const satisfies Record<ExamType, Composition>

function rescaleComposition(profileComp: Composition, oldTotal: number, newTotal: number): Composition {
  const mcqSingle = Math.round(profileComp.mcqSingle / oldTotal * newTotal)
  const mcqMulti = Math.round(profileComp.mcqMulti / oldTotal * newTotal)
  const trueFalse = Math.max(0, newTotal - mcqSingle - mcqMulti)
  return { mcqSingle, mcqMulti, trueFalse }
}

// Budget for the elapsed-time animation. Real Claude calls run 25–60s;
// 45s keeps the bar crawling through ~P75 without freezing early.
const GENERATE_DURATION_MS = 45000

// ── Fokus Guru chip suggestions (PRD §8.7) ───────────────────────────────────

interface FokusGuruChipsProps {
  topik: string
  onAppend: (snippet: string) => void
}

function FokusGuruChips({ onAppend, topik }: FokusGuruChipsProps) {
  const focusOnTopik = topik.trim() !== ""
  const chips: ReadonlyArray<{ label: string; snippet: string; disabled: boolean }> = [
    {
      label: focusOnTopik ? `Fokus pada: ${topik}` : "Fokus pada: (pilih topik)",
      snippet: focusOnTopik ? `Fokus pada: ${topik}.` : "",
      disabled: !focusOnTopik
    },
    { label: "Kesalahan umum: …", snippet: "Kesalahan umum: ", disabled: false },
    { label: "Buat soal kontekstual tentang …", snippet: "Buat soal kontekstual tentang ", disabled: false },
    { label: "Hubungkan dengan: …", snippet: "Hubungkan dengan: ", disabled: false }
  ]

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={chip.disabled}
          onClick={() => onAppend(chip.snippet)}
          className={[
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-caption",
            "border transition-all duration-[120ms]",
            chip.disabled
              ? "border-border-default bg-bg-muted text-text-tertiary cursor-not-allowed opacity-60"
              : "border-border-ui bg-bg-surface text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-[0.97]"
          ].join(" ")}
          aria-label={`Tambahkan template: ${chip.label}`}
        >
          + {chip.label}
        </button>
      ))}
    </div>
  )
}

// ── Section header helper ─────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary whitespace-nowrap">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function GeneratePage() {
  const navigate = useNavigate()
  const { simulate } = Route.useSearch()

  // Form state
  const [sourceMode, setSourceMode] = useState<SourceMode>("default")
  const [freeTopic, setFreeTopic] = useState<string>("")
  const [uploadedPdfId, setUploadedPdfId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [kelas, setKelas] = useState<string>("")
  const [mapel, setMapel] = useState<ExamSubject>("bahasa_indonesia")
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

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const gradeOptions = useMemo(() => {
    if (catalogStatus !== "ready") return FALLBACK_GENERATE_GRADES
    const grades = Array.from(
      new Set(curriculumCatalog.flatMap((item) => item.grades.map((entry) => entry.grade)))
    ).sort((a, b) => a - b)
    return grades.length > 0 ? grades : FALLBACK_GENERATE_GRADES
  }, [catalogStatus, curriculumCatalog])
  const selectedSubjectReady = readySubjectOptions.some((subject) => subject.value === mapel)
  const subjectMeta = subjectMetaFor(selectedSubjectReady ? mapel : readySubjectOptions[0]?.value ?? mapel)

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
  const pdfSatisfied = !showPdfControls || selectedFile !== null || uploadedPdfId !== null

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
    if (next === "default") {
      setSelectedFile(null)
      setUploadedPdfId(null)
      setFreeTopic("")
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

    const startGenerate = (pdfUploadId?: string) => {
      void api.ai.generate({
        sourceMode,
        subject: mapel,
        grade: Number(kelas) as Grade,
        difficulty: kesulitan as "mudah" | "sedang" | "sulit" | "campuran",
        topics: submitTopics,
        reviewMode,
        examType,
        totalSoal,
        composition,
        classContext: fokusGuru.trim() !== "" ? fokusGuru.trim() : undefined,
        exampleQuestions: contohSoal.trim() !== "" ? contohSoal.trim() : undefined,
        ...(sourceMode === "pdf_guru" && freeTopic.trim() !== "" ? { freeTopic: freeTopic.trim() } : {}),
        ...(pdfUploadId !== undefined ? { pdfUploadId: pdfUploadId as PdfUploadId } : {})
      }).then((result) => {
        const exam = unwrapApiEither(result)
        clearTimers()
        setProgress(100)

        completionTimerRef.current = setTimeout(() => {
          setIsGenerating(false)
          void navigate({
            to: "/review",
            search: { examId: exam.id, mode: reviewMode, from: "generate" }
          })
        }, 450)
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
    fokusGuru,
    freeTopic,
    kelas,
    kesulitan,
    mapel,
    navigate,
    reviewMode,
    selectedFile,
    showCustomInput,
    showPdfControls,
    sourceMode,
    topiks,
    totalSoal,
    uploadedPdfId
  ])

  const handleGenerate = () => {
    runGenerate()
  }

  const handleRetry = () => {
    setShowErrorDialog(false)
    setGenerateErrorMessage(null)
    runGenerate()
  }

  const compositionSum = composition.mcqSingle + composition.mcqMulti + composition.trueFalse
  const isCompositionValid = compositionSum === totalSoal
  const isFormValid = Boolean(
    kelas && mapel && topicsSatisfied && pdfSatisfied && kesulitan && !isGenerating && totalSoalError === null &&
      isCompositionValid && catalogStatus === "ready" && selectedSubjectReady
  )

  const topikSummary = effectiveTopiks.join(", ")

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
                <FileUpload
                  onFileSelect={(file) => {
                    setSelectedFile(file)
                    setUploadedPdfId(null)
                  }}
                  onFileRemove={() => {
                    setSelectedFile(null)
                    setUploadedPdfId(null)
                  }}
                  selectedFile={selectedFile}
                />
              ) :
              null}

            {sourceMode === "pdf_guru" ?
              (
                <div className="space-y-1.5">
                  <Label htmlFor="free-topic">Topik bebas</Label>
                  <Textarea
                    id="free-topic"
                    value={freeTopic}
                    onChange={(e) => setFreeTopic(e.target.value)}
                    placeholder="Contoh: Ekosistem dan pencemaran lingkungan di sekitar sekolah"
                    rows={3}
                  />
                  <p className="text-caption text-text-tertiary">Wajib diisi, minimal 10 karakter.</p>
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
              <Select
                value={mapel}
                disabled={kelas === "" || catalogStatus !== "ready" || readySubjectOptions.length === 0}
                onValueChange={(v) => {
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
                  {readySubjectOptions.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
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
                <p className="text-caption text-warning-fg">Belum ada materi PDF yang siap untuk kelas ini.</p> :
                null}
            </div>

            {/* Materi */}
            {(babRequired || sourceMode === "pdf_guru") ?
              (
                <div className="space-y-2">
                  <Label>{sourceMode === "pdf_guru" ? "Bab (opsional)" : "Materi"}</Label>
                  <div className={kelas === "" ? "pointer-events-none opacity-60" : undefined}>
                    {sourceMode === "pdf_guru" ?
                      (
                        <TopicMultiSelect
                          options={babTopicOptions}
                          selected={topiks}
                          onChange={setTopiks}
                          maxItems={8}
                          placeholder={kelas === "" ?
                            "Pilih kelas dulu" :
                            babTopicsStatus === "loading" ?
                            "Memuat daftar Bab..." :
                            "Pilih Bab sebagai petunjuk (opsional)..."}
                        />
                      ) :
                      (
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
                      )}
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
                  {showCustomInput && sourceMode !== "pdf_guru" ?
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
                disabled={!isFormValid}
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
        <Card className="sticky top-[72px]">
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
                    {subjectMeta.short}
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
                  {effectiveTopiks.length > 0
                    ? topikSummary.length > 50
                      ? topikSummary.slice(0, 50) + "…"
                      : topikSummary
                    : "—"}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Kesulitan</span>
                <span className="text-text-primary">
                  {kesulitan ? (KESULITAN_LABELS[kesulitan] ?? kesulitan) : "—"}
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
            {selectedFile !== null ?
              (
                <div className="flex items-center gap-2 text-body-sm pt-1 border-t border-border-default">
                  <FileText size={14} className="text-text-tertiary shrink-0" />
                  <span className="text-text-secondary truncate">{selectedFile.name}</span>
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
    </div>
  )
}
