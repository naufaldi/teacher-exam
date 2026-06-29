import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import type { ExamDetailResponse, ExamType } from "@teacher-exam/shared"
import { Badge, Button, PageHeader, Tabs, TabsList, TabsTrigger } from "@teacher-exam/ui"
import { BookOpen, ClipboardList, FileText, Key, Layers, Printer } from "lucide-react"
import { useState } from "react"
import {
  ExamSheetBody,
  ExamSheetPrintStyles,
  kopLabelFor,
  triggerPrint
} from "../components/exam-sheet/index.js"
import { ExportMenu } from "../components/export-menu.js"
import { MarkdownMath } from "../components/markdown-math.js"
import { PaperFrame } from "../components/exam-sheet/exam-sheet-sections.js"
import { api, unwrapApiEither } from "../lib/api.js"
import { examDraftStore, useExamDraft } from "../lib/exam-draft-store.js"
import { subjectMetaFor } from "../lib/subjects.js"

export const Route = createFileRoute("/_auth/preview")({
  component: PreviewPage,
  validateSearch: (search): { examId?: string } => {
    const examId = search["examId"]
    return typeof examId === "string" ? { examId } : {}
  },
  loaderDeps: ({ search }) => ({ examId: search.examId }),
  loader: async ({ deps }) => {
    if (!deps.examId) throw redirect({ to: "/dashboard" })
    const exam = unwrapApiEither(await api.exams.get(deps.examId))
    examDraftStore.setQuestions([...exam.questions])
    examDraftStore.setReviewMode(exam.reviewMode as "fast" | "slow")
    examDraftStore.setConfig({
      subject: exam.subject,
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
    return exam
  }
})

function PreviewPage() {
  const navigate = useNavigate()
  const draft = useExamDraft()
  const exam = Route.useLoaderData()
  const [tab, setTab] = useState<"soal" | "lj" | "kunci" | "semua" | "pembahasan">("semua")

  const { grade, metadata, questions, subject } = draft
  const subjectLabel = subjectMetaFor(subject).label
  const topicsLabel = exam?.topics?.join(" · ") ?? ""

  return (
    <div className="space-y-6">
      <PageHeader
        data-screen-only
        data-no-print
        title="Preview Lembar"
        subtitle={`${kopLabelFor(metadata.examType)} · ${subjectLabel} — Kelas ${grade} SD`}
        onBack={() => {
          void navigate({ to: "/review", search: { mode: draft.reviewMode } })
        }}
        backLabel="Kembali ke Review"
      >
        <Badge variant="secondary">{questions.length} soal</Badge>
      </PageHeader>

      <div
        data-screen-only
        data-no-print
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="semua">
              <Layers className="h-3.5 w-3.5 mr-1.5" /> Semua
            </TabsTrigger>
            <TabsTrigger value="soal">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Soal
            </TabsTrigger>
            <TabsTrigger value="lj">
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Lembar Jawaban
            </TabsTrigger>
            <TabsTrigger value="kunci">
              <Key className="h-3.5 w-3.5 mr-1.5" /> Kunci
            </TabsTrigger>
            <TabsTrigger value="pembahasan">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Pembahasan
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => triggerPrint("soal")}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Soal
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerPrint("lj")}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak LJ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerPrint("kunci")}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Kunci
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerPrint("pembahasan")}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Pembahasan
          </Button>
          <ExportMenu
            onExport={(format) => api.exams.export(exam.id, format, "soal")}
            onPrint={() => triggerPrint("all")}
            triggerLabel="Unduh / Cetak"
          />
        </div>
      </div>

      {(tab === "soal" || tab === "semua") && questions.length > 0 ?
        (
          <div
            data-screen-only
            data-no-print
            className="rounded-md border border-border-default bg-bg-surface p-4"
          >
            <span className="text-body-sm text-text-secondary">
              {questions.length} soal tersimpan otomatis di{" "}
              <Link to="/bank-soal" className="font-medium text-text-primary underline underline-offset-2">
                Bank Soal
              </Link>
            </span>
          </div>
        ) :
        null}

      <ExamSheetPrintStyles />

      <div data-print-content data-screen-tab={tab} className="space-y-6">
        <ExamSheetBody
          grade={grade}
          metadata={metadata}
          questions={questions}
          subjectLabel={subjectLabel}
          topicsLabel={topicsLabel}
        />
        {exam ?
          <PreviewPembahasanSection exam={exam} /> :
          null}
      </div>
    </div>
  )
}

function PreviewPembahasanSection({ exam }: { exam: ExamDetailResponse }) {
  const [md, setMd] = useState<string | null>(exam.discussionMd)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    setGenerateError(null)
    void api.exams.streamDiscussion(
      exam.id,
      (updated) => {
        setMd(updated.discussionMd)
        setIsGenerating(false)
      },
      (message) => {
        const isFetchError = message === "Failed to fetch" || message.toLowerCase().includes("failed to fetch")
        setGenerateError(
          isFetchError
            ? "Koneksi terputus saat membuat pembahasan. Coba lagi sebentar."
            : message || "Gagal membuat pembahasan. Coba lagi."
        )
        setIsGenerating(false)
      }
    )
  }

  return (
    <div data-print-section="pembahasan" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-5">
          <p className="text-base font-bold uppercase">PEMBAHASAN</p>
        </div>
        {md === null ?
          (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-kertas-600">Pembahasan belum dibuat untuk ujian ini.</p>
              {generateError ? <p className="text-sm text-danger-600">{generateError}</p> : null}
              <Button onClick={handleGenerate} disabled={isGenerating}>
                <BookOpen className="h-4 w-4 mr-2" />
                {isGenerating
                  ? "Membuat Pembahasan..."
                  : generateError
                  ? "Coba Lagi"
                  : "Generate Pembahasan"}
              </Button>
            </div>
          ) :
          (
            <div className="prose prose-sm max-w-none text-[13px] leading-relaxed">
              <MarkdownMath markdown={md} />
            </div>
          )}
      </PaperFrame>
    </div>
  )
}
