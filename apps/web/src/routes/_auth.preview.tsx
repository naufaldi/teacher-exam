import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Printer, ArrowLeft, FileText, ClipboardList, Key, Layers } from 'lucide-react'
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  PageHeader,
} from '@teacher-exam/ui'
import { useExamDraft } from '../lib/exam-draft-store.js'
import type { ExamType, Question } from '@teacher-exam/shared'

export const Route = createFileRoute('/_auth/preview')({
  component: PreviewPage,
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

type PrintScope = 'all' | 'soal' | 'lj' | 'kunci'

function triggerPrint(scope: PrintScope) {
  const body = document.body
  body.dataset['printScope'] = scope
  // Defer to next tick so the data attribute is applied before print dialog opens
  window.setTimeout(() => {
    window.print()
    window.setTimeout(() => {
      delete body.dataset['printScope']
    }, 200)
  }, 50)
}

function PreviewPage() {
  const navigate = useNavigate()
  const draft = useExamDraft()
  const [tab, setTab] = useState<'soal' | 'lj' | 'kunci' | 'semua'>('semua')

  const { questions, metadata, subject, grade } = draft
  const subjectLabel = SUBJECT_LABELS[subject] ?? subject

  return (
    <div className="space-y-6">
      <PageHeader
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
          [data-print-content][data-screen-tab="lj"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="kunci"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="lj"] {
            display: none !important;
          }
        }
        @media print {
          body[data-print-scope="soal"] [data-print-section="lj"],
          body[data-print-scope="soal"] [data-print-section="kunci"],
          body[data-print-scope="lj"] [data-print-section="soal"],
          body[data-print-scope="lj"] [data-print-section="kunci"],
          body[data-print-scope="kunci"] [data-print-section="soal"],
          body[data-print-scope="kunci"] [data-print-section="lj"] {
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
        <SoalSection metadata={metadata} subjectLabel={subjectLabel} grade={grade} questions={questions} />
        <LembarJawabanSection metadata={metadata} subjectLabel={subjectLabel} grade={grade} count={questions.length} />
        <KunciSection subjectLabel={subjectLabel} grade={grade} questions={questions} examType={kopLabelFor(metadata.examType)} />
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
}: {
  metadata: { schoolName: string; academicYear: string; examType: string; examDate: string; durationMinutes: number }
  subjectLabel: string
  grade: number
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
      </div>
    </>
  )
}

function SoalSection({
  metadata,
  subjectLabel,
  grade,
  questions,
}: {
  metadata: { schoolName: string; academicYear: string; examType: string; examDate: string; durationMinutes: number; instructions: string }
  subjectLabel: string
  grade: number
  questions: Question[]
}) {
  return (
    <div data-print-section="soal">
      <PaperFrame>
        <PaperHeader metadata={metadata} subjectLabel={subjectLabel} grade={grade} />

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
              <ol className="space-y-0.5 ml-4">
                {(['a', 'b', 'c', 'd'] as const).map((letter) => (
                  <li key={letter} className="flex gap-2">
                    <span className="font-semibold">{letter}.</span>
                    <span>{q[`option${letter.toUpperCase() as 'A' | 'B' | 'C' | 'D'}`]}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </PaperFrame>
    </div>
  )
}

function LembarJawabanSection({
  metadata,
  subjectLabel,
  grade,
  count,
}: {
  metadata: { schoolName: string; academicYear: string; examType: string; examDate: string; durationMinutes: number }
  subjectLabel: string
  grade: number
  count: number
}) {
  const numbers = Array.from({ length: count }, (_, i) => i + 1)
  const left = numbers.slice(0, Math.ceil(count / 2))
  const right = numbers.slice(Math.ceil(count / 2))

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
          <AnswerColumn numbers={left} />
          <AnswerColumn numbers={right} />
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

function AnswerColumn({ numbers }: { numbers: number[] }) {
  return (
    <div className="space-y-1.5">
      {numbers.map((n) => (
        <div key={n} className="flex items-center gap-2">
          <span className="font-mono font-semibold w-6 text-right">{n}.</span>
          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
            <span
              key={letter}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-black text-[11px] font-mono"
            >
              {letter}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function KunciSection({
  subjectLabel,
  grade,
  questions,
  examType,
}: {
  subjectLabel: string
  grade: number
  questions: Question[]
  examType: string
}) {
  return (
    <div data-print-section="kunci" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-5">
          <p className="text-base font-bold uppercase">KUNCI JAWABAN</p>
          <p className="text-sm mt-1">
            {examType} {subjectLabel} — Kelas {grade} SD
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3 text-sm">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between px-2 py-1 border border-black/40 rounded-sm"
            >
              <span className="font-mono font-semibold">{q.number}.</span>
              <span className="font-mono font-bold">{q.correctAnswer.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-center">
          <p>Setiap jawaban benar bernilai <strong>5 poin</strong>.</p>
          <p className="font-bold">Total: {questions.length * 5} poin</p>
        </div>
      </PaperFrame>
    </div>
  )
}
