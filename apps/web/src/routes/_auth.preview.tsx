import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Printer, FileText, ClipboardList, Key, Layers, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  PageHeader,
} from '@teacher-exam/ui'
import { examDraftStore, useExamDraft } from '../lib/exam-draft-store.js'
import { pointsPerQuestion } from '../lib/points.js'
import { matchQuestion, questionCorrectLabel } from '../lib/question-render.js'
import type { ExamDetailResponse, ExamType, Question } from '@teacher-exam/shared'
import { api } from '../lib/api.js'

export const Route = createFileRoute('/_auth/preview')({
  component: PreviewPage,
  validateSearch: (search): { examId?: string } => {
    const examId = search['examId']
    return typeof examId === 'string' ? { examId } : {}
  },
  loaderDeps: ({ search }) => ({ examId: search.examId }),
  loader: async ({ deps }) => {
    if (!deps.examId) throw redirect({ to: '/dashboard' })
    const exam = await api.exams.get(deps.examId)
    examDraftStore.setQuestions([...exam.questions])
    examDraftStore.setReviewMode(exam.reviewMode as 'fast' | 'slow')
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

const SUBJECT_LABELS: Record<string, string> = {
  bahasa_indonesia: 'Bahasa Indonesia',
  pendidikan_pancasila: 'Pendidikan Pancasila',
}

/**
 * Uppercase title printed in the kop of the printed sheet. See PRD §8.6.
 * Mirror of `EXAM_TYPE_PROFILE[*].kopLabel` in apps/api — kept duplicated to
 * avoid pulling backend code into the web bundle.
 */
const EXAM_TYPE_KOP_LABELS: Record<ExamType, string> = {
  latihan: 'LATIHAN SOAL',
  formatif: 'ULANGAN HARIAN',
  sts: 'PENILAIAN TENGAH SEMESTER',
  sas: 'PENILAIAN AKHIR SEMESTER',
  tka: 'TKA',
}

function kopLabelFor(examType: string): string {
  return EXAM_TYPE_KOP_LABELS[examType as ExamType] ?? examType.toUpperCase()
}

type PrintScope = 'all' | 'soal' | 'lj' | 'kunci' | 'pembahasan'
const PRINT_CLEANUP_FALLBACK_MS = 10_000

function triggerPrint(scope: PrintScope) {
  const body = document.body
  let fallbackId: number | undefined

  const cleanup = () => {
    if (fallbackId !== undefined) window.clearTimeout(fallbackId)
    window.removeEventListener('afterprint', cleanup)
    delete body.dataset['printScope']
  }

  body.dataset['printScope'] = scope
  window.addEventListener('afterprint', cleanup, { once: true })

  // Defer to next tick so the data attribute is applied before print dialog opens
  window.setTimeout(() => {
    window.print()
    fallbackId = window.setTimeout(cleanup, PRINT_CLEANUP_FALLBACK_MS)
  }, 50)
}

function PreviewPage() {
  const navigate = useNavigate()
  const draft = useExamDraft()
  const exam = Route.useLoaderData()
  const [tab, setTab] = useState<'soal' | 'lj' | 'kunci' | 'semua' | 'pembahasan'>('semua')

  const { questions, metadata, subject, grade } = draft
  const subjectLabel = SUBJECT_LABELS[subject] ?? subject
  const topicsLabel = exam?.topics?.join(' · ') ?? ''

  return (
    <div className="space-y-6">
      <PageHeader
        data-screen-only
        data-no-print
        title="Preview Lembar"
        subtitle={`${kopLabelFor(metadata.examType)} · ${subjectLabel} — Kelas ${grade} SD`}
        onBack={() => {
          void navigate({ to: '/review', search: { mode: draft.reviewMode } })
        }}
        backLabel="Kembali ke Review"
      >
        <Badge variant="secondary">{questions.length} soal</Badge>
      </PageHeader>

      {/* Action bar — hidden in print */}
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
          <Button variant="ghost" size="sm" onClick={() => triggerPrint('soal')}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Soal
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerPrint('lj')}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak LJ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerPrint('kunci')}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Kunci
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerPrint('pembahasan')}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Pembahasan
          </Button>
          <Button onClick={() => triggerPrint('all')}>
            <Printer className="h-4 w-4 mr-2" /> Cetak Semua
          </Button>
        </div>
      </div>

      {/* Print scope CSS */}
      <style>{`
        @media screen {
          [data-print-content][data-screen-tab="soal"] [data-print-section="lj"],
          [data-print-content][data-screen-tab="soal"] [data-print-section="kunci"],
          [data-print-content][data-screen-tab="soal"] [data-print-section="pembahasan"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="kunci"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="pembahasan"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="lj"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="pembahasan"],
          [data-print-content][data-screen-tab="pembahasan"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="pembahasan"] [data-print-section="lj"],
          [data-print-content][data-screen-tab="pembahasan"] [data-print-section="kunci"] {
            display: none !important;
          }
        }
        @media print {
          body[data-print-scope="soal"] [data-print-section="lj"],
          body[data-print-scope="soal"] [data-print-section="kunci"],
          body[data-print-scope="soal"] [data-print-section="pembahasan"],
          body[data-print-scope="lj"] [data-print-section="soal"],
          body[data-print-scope="lj"] [data-print-section="kunci"],
          body[data-print-scope="lj"] [data-print-section="pembahasan"],
          body[data-print-scope="kunci"] [data-print-section="soal"],
          body[data-print-scope="kunci"] [data-print-section="lj"],
          body[data-print-scope="kunci"] [data-print-section="pembahasan"],
          body[data-print-scope="pembahasan"] [data-print-section="soal"],
          body[data-print-scope="pembahasan"] [data-print-section="lj"],
          body[data-print-scope="pembahasan"] [data-print-section="kunci"] {
            display: none !important;
          }
          [data-preview-frame] {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Preview content — all sections always rendered; screen visibility controlled via data-screen-tab */}
      <div data-print-content data-screen-tab={tab} className="space-y-6">
        <SoalSection metadata={metadata} subjectLabel={subjectLabel} grade={grade} questions={questions} topicsLabel={topicsLabel} />
        <LembarJawabanSection metadata={metadata} subjectLabel={subjectLabel} grade={grade} questions={questions} topicsLabel={topicsLabel} />
        <KunciSection subjectLabel={subjectLabel} grade={grade} questions={questions} examType={kopLabelFor(metadata.examType)} topicsLabel={topicsLabel} />
        {exam ? <PembahasanSection exam={exam} /> : null}
      </div>
    </div>
  )
}

// ── A4-styled paper sections ─────────────────────────────────────────────────

function PaperFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-preview-frame
      className="mx-auto bg-white border border-border-default rounded-md shadow-sm"
      style={{
        width: 'min(100%, 794px)', // ~A4 width @ 96dpi
        padding: '40px 48px',
        fontFamily: 'var(--font-serif)',
        color: '#000',
      }}
    >
      {children}
    </div>
  )
}

function PaperHeader({
  metadata,
  subjectLabel,
  grade,
  topicsLabel,
}: {
  metadata: { schoolName: string; academicYear: string; examType: string; examDate: string; durationMinutes: number }
  subjectLabel: string
  grade: number
  topicsLabel: string
}) {
  return (
    <>
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-sm font-bold uppercase tracking-wide">
          {metadata.schoolName || 'SD Negeri ___________'}
        </p>
        <p className="text-base font-bold uppercase mt-1 underline">
          {kopLabelFor(metadata.examType)} Tahun Pelajaran {metadata.academicYear || '____/____'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
        <p>Nama : ............................................</p>
        <p>Mata Pelajaran : <strong>{subjectLabel}</strong></p>
        <p>No. Absen : ......................................</p>
        <p>Hari/Tanggal : {metadata.examDate || '......................'}</p>
        <p>Kelas : {grade} SD</p>
        <p>Waktu : {metadata.durationMinutes || 60} menit</p>
        {topicsLabel ? <p className="col-span-2">Materi : {topicsLabel}</p> : null}
      </div>
    </>
  )
}

// ── Question renderers for Soal section ──────────────────────────────────────

const OPTION_LETTERS = ['a', 'b', 'c', 'd'] as const

function renderMcqOptions(options: { a: string; b: string; c: string; d: string }) {
  return (
    <ol className="space-y-0.5 ml-4">
      {OPTION_LETTERS.map((letter) => (
        <li key={letter} className="flex gap-2">
          <span className="font-semibold">{letter}.</span>
          <span>{options[letter]}</span>
        </li>
      ))}
    </ol>
  )
}

function renderTrueFalseTable(statements: ReadonlyArray<{ text: string; answer: boolean }>) {
  return (
    <table className="w-full mt-1.5 text-[12px] border-collapse">
      <thead>
        <tr>
          <th className="text-left font-semibold border border-black/40 px-2 py-1">Pernyataan</th>
          <th className="text-center font-semibold border border-black/40 px-2 py-1">B</th>
          <th className="text-center font-semibold border border-black/40 px-2 py-1">S</th>
        </tr>
      </thead>
      <tbody>
        {statements.map((stmt, i) => (
          <tr key={i}>
            <td className="border border-black/40 px-2 py-1">{stmt.text}</td>
            <td className="text-center border border-black/40 px-2 py-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-black/60 text-[10px]" />
            </td>
            <td className="text-center border border-black/40 px-2 py-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-black/60 text-[10px]" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SoalSection({
  metadata,
  subjectLabel,
  grade,
  questions,
  topicsLabel,
}: {
  metadata: { schoolName: string; academicYear: string; examType: string; examDate: string; durationMinutes: number; instructions: string }
  subjectLabel: string
  grade: number
  questions: Question[]
  topicsLabel: string
}) {
  return (
    <div data-print-section="soal">
      <PaperFrame>
        <PaperHeader metadata={metadata} subjectLabel={subjectLabel} grade={grade} topicsLabel={topicsLabel} />

        {/* Petunjuk */}
        {metadata.instructions ? (
          <div className="border border-black p-3 mb-5 text-sm">
            <p className="font-bold mb-1">PETUNJUK PENGERJAAN:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {metadata.instructions
                .split('\n')
                .filter((l) => l.trim() !== '')
                .map((line, i) => (
                  <li key={i}>{line.trim()}</li>
                ))}
            </ol>
          </div>
        ) : null}

        {/* 2-column soal grid */}
        <div className="columns-1 md:columns-2 gap-8 text-[13px] leading-relaxed">
          {questions.map((q) => (
            <div key={q.id} className="break-inside-avoid mb-4">
              <p className="mb-1.5">
                <span className="font-bold mr-1">{q.number}.</span>
                <span className="whitespace-pre-line">{q.text}</span>
              </p>
              {matchQuestion(q, {
                mcq_single: (x) => renderMcqOptions(x.options),
                mcq_multi: (x) => renderMcqOptions(x.options),
                true_false: (x) => renderTrueFalseTable(x.statements),
              })}
            </div>
          ))}
        </div>
      </PaperFrame>
    </div>
  )
}

// ── Answer sheet renderers for Lembar Jawaban ────────────────────────────────

function renderMcqBubbleRow(number: number) {
  return (
    <div key={number} className="flex items-center gap-2">
      <span className="font-mono font-semibold w-6 text-right">{number}.</span>
      {(['A', 'B', 'C', 'D'] as const).map((letter) => (
        <span
          key={letter}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-black text-[11px] font-mono"
        >
          {letter}
        </span>
      ))}
    </div>
  )
}

function renderTrueFalseBubbleRow(number: number, statementCount: number) {
  return (
    <div key={number} className="mb-1">
      <span className="font-mono font-semibold mr-2">{number}.</span>
      <table className="inline-table text-[11px] border-collapse">
        <thead>
          <tr>
            <th className="border border-black/40 px-1 py-0.5 w-20">Pernyataan</th>
            <th className="border border-black/40 px-1 py-0.5 text-center">B</th>
            <th className="border border-black/40 px-1 py-0.5 text-center">S</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: statementCount }, (_, i) => (
            <tr key={i}>
              <td className="border border-black/40 px-1 py-0.5">{i + 1}</td>
              <td className="border border-black/40 px-1 py-0.5 text-center">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-black/60" />
              </td>
              <td className="border border-black/40 px-1 py-0.5 text-center">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-black/60" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LembarJawabanSection({
  metadata,
  subjectLabel,
  grade,
  questions,
  topicsLabel,
}: {
  metadata: { schoolName: string; academicYear: string; examType: string; examDate: string; durationMinutes: number }
  subjectLabel: string
  grade: number
  questions: Question[]
  topicsLabel: string
}) {
  const left = questions.slice(0, Math.ceil(questions.length / 2))
  const right = questions.slice(Math.ceil(questions.length / 2))

  return (
    <div data-print-section="lj" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <p className="text-sm font-bold uppercase tracking-wide">
            {metadata.schoolName || 'SD Negeri ___________'}
          </p>
          <p className="text-base font-bold uppercase mt-1">LEMBAR JAWABAN</p>
          <p className="text-sm">
            {kopLabelFor(metadata.examType)} · {subjectLabel} — Kelas {grade} SD
          </p>
          {topicsLabel ? <p className="text-sm">{topicsLabel}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-5">
          <p>Nama : ............................................</p>
          <p>Tahun Pelajaran : {metadata.academicYear || '____/____'}</p>
          <p>No. Absen : ......................................</p>
          <p>Hari/Tanggal : {metadata.examDate || '......................'}</p>
          <p>Kelas : {grade} SD</p>
          <p>Waktu : {metadata.durationMinutes || 60} menit</p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <AnswerColumn questions={left} />
          <AnswerColumn questions={right} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="border-t border-black pt-1 text-center">Tanda Tangan Siswa</p>
          </div>
          <div>
            <p className="border-t border-black pt-1 text-center">Tanda Tangan Guru</p>
          </div>
        </div>
        <div className="mt-6 text-right text-base font-bold">
          Nilai: ________ / 100
        </div>
      </PaperFrame>
    </div>
  )
}

function AnswerColumn({ questions }: { questions: Question[] }) {
  return (
    <div className="space-y-1.5">
      {questions.map((q) =>
        matchQuestion(q, {
          mcq_single: (x) => renderMcqBubbleRow(x.number),
          mcq_multi: (x) => renderMcqBubbleRow(x.number),
          true_false: (x) => renderTrueFalseBubbleRow(x.number, x.statements.length),
        }),
      )}
    </div>
  )
}

function KunciSection({
  subjectLabel,
  grade,
  questions,
  examType,
  topicsLabel,
}: {
  subjectLabel: string
  grade: number
  questions: Question[]
  examType: string
  topicsLabel: string
}) {
  return (
    <div data-print-section="kunci" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-5">
          <p className="text-base font-bold uppercase">KUNCI JAWABAN</p>
          <p className="text-sm mt-1">
            {examType} {subjectLabel} — Kelas {grade} SD
          </p>
          {topicsLabel ? <p className="text-sm mt-0.5">{topicsLabel}</p> : null}
        </div>
        <div className="grid grid-cols-5 gap-3 text-sm">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between px-2 py-1 border border-black/40 rounded-sm"
            >
              <span className="font-mono font-semibold">{q.number}.</span>
              <span className="font-mono font-bold">{questionCorrectLabel(q)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-center">
          {(() => {
            const poinPerSoal = pointsPerQuestion(questions.length)
            const totalPoin = questions.length * poinPerSoal
            return (
              <>
                <p>Setiap jawaban benar bernilai <strong>{poinPerSoal} poin</strong>.</p>
                <p className="font-bold">Total: {totalPoin} poin</p>
              </>
            )
          })()}
        </div>
      </PaperFrame>
    </div>
  )
}

function PembahasanSection({ exam }: { exam: ExamDetailResponse }) {
  const [md, setMd] = useState<string | null>(exam.discussionMd)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    setGenerateError(null)
    void api.exams.generateDiscussion(exam.id).then((updated) => {
      setMd(updated.discussionMd)
    }).catch((err: unknown) => {
      setGenerateError(err instanceof Error ? err.message : 'Gagal membuat pembahasan. Coba lagi.')
    }).finally(() => {
      setIsGenerating(false)
    })
  }

  return (
    <div data-print-section="pembahasan" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-5">
          <p className="text-base font-bold uppercase">PEMBAHASAN</p>
        </div>
        {md === null ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-kertas-600">Pembahasan belum dibuat untuk ujian ini.</p>
            {generateError ? (
              <p className="text-sm text-danger-600">{generateError}</p>
            ) : null}
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <BookOpen className="h-4 w-4 mr-2" />
              {isGenerating ? 'Membuat Pembahasan...' : 'Generate Pembahasan'}
            </Button>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-[13px] leading-relaxed">
            <ReactMarkdown>{md}</ReactMarkdown>
          </div>
        )}
      </PaperFrame>
    </div>
  )
}
