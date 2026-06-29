import type { Question } from "@teacher-exam/shared"
import type { ReactNode } from "react"
import { FigureSvg } from "../figure-svg.js"
import { MarkdownMath } from "../markdown-math.js"
import { MathText } from "../math-text.js"
import { pointsPerQuestion } from "../../lib/points.js"
import { matchQuestion, questionCorrectLabel } from "../../lib/question-render.js"
import { kopLabelFor } from "./exam-type-labels.js"
import type { ExamSheetMetadata } from "./exam-sheet-types.js"

function PaperFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-preview-frame
      className="mx-auto bg-white border border-border-default rounded-md shadow-sm"
      style={{
        width: "min(100%, 794px)",
        padding: "40px 48px",
        fontFamily: "var(--font-serif)",
        color: "#000"
      }}
    >
      {children}
    </div>
  )
}

function PaperHeader({
  grade,
  metadata,
  subjectLabel,
  topicsLabel
}: {
  metadata: Pick<ExamSheetMetadata, "schoolName" | "academicYear" | "examType" | "examDate" | "durationMinutes">
  subjectLabel: string
  grade: number
  topicsLabel: string
}) {
  return (
    <>
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-sm font-bold uppercase tracking-wide">
          {metadata.schoolName || "SD Negeri ___________"}
        </p>
        <p className="text-base font-bold uppercase mt-1 underline">
          {kopLabelFor(metadata.examType)} Tahun Pelajaran {metadata.academicYear || "____/____"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
        <p>Nama : ............................................</p>
        <p>
          Mata Pelajaran : <strong>{subjectLabel}</strong>
        </p>
        <p>No. Absen : ......................................</p>
        <p>Hari/Tanggal : {metadata.examDate || "......................"}</p>
        <p>Kelas : {grade} SD</p>
        <p>Waktu : {metadata.durationMinutes || 60} menit</p>
        {topicsLabel ? <p className="col-span-2">Materi : {topicsLabel}</p> : null}
      </div>
    </>
  )
}

const OPTION_LETTERS = ["a", "b", "c", "d"] as const

function McqOptionsList({ options }: { options: { a: string; b: string; c: string; d: string } }) {
  return (
    <ol className="space-y-0.5 ml-4">
      {OPTION_LETTERS.map((letter) => (
        <li key={letter} className="flex gap-2">
          <span className="font-semibold">{letter}.</span>
          <span>
            <MathText text={options[letter]} />
          </span>
        </li>
      ))}
    </ol>
  )
}

function TrueFalseTable({ statements }: { statements: ReadonlyArray<{ text: string; answer: boolean }> }) {
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
            <td className="border border-black/40 px-2 py-1">
              <MathText text={stmt.text} />
            </td>
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
  grade,
  metadata,
  questions,
  subjectLabel,
  topicsLabel
}: {
  metadata: ExamSheetMetadata
  subjectLabel: string
  grade: number
  questions: Array<Question>
  topicsLabel: string
}) {
  return (
    <div data-print-section="soal">
      <PaperFrame>
        <PaperHeader metadata={metadata} subjectLabel={subjectLabel} grade={grade} topicsLabel={topicsLabel} />

        {metadata.instructions ?
          (
            <div className="border border-black p-3 mb-5 text-sm">
              <p className="font-bold mb-1">PETUNJUK PENGERJAAN:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                {metadata.instructions
                  .split("\n")
                  .filter((l) => l.trim() !== "")
                  .map((line, i) => <li key={i}>{line.trim()}</li>)}
              </ol>
            </div>
          ) :
          null}

        <div className="columns-1 md:columns-2 gap-8 text-[13px] leading-relaxed">
          {questions.map((q) => (
            <div key={q.id} className="break-inside-avoid mb-4">
              <p className="mb-1.5">
                <span className="font-bold mr-1">{q.number}.</span>
                <span className="whitespace-pre-line">
                  <MathText text={q.text} />
                </span>
              </p>
              {q.figure ? <FigureSvg figure={q.figure} /> : null}
              {matchQuestion(q, {
                mcq_single: (x) => <McqOptionsList options={x.options} />,
                mcq_multi: (x) => <McqOptionsList options={x.options} />,
                true_false: (x) => <TrueFalseTable statements={x.statements} />
              })}
            </div>
          ))}
        </div>
      </PaperFrame>
    </div>
  )
}

function McqBubbleRow({ number }: { number: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono font-semibold w-6 text-right">{number}.</span>
      {(["A", "B", "C", "D"] as const).map((letter) => (
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

function TrueFalseBubbleRow({ number, statementCount }: { number: number; statementCount: number }) {
  return (
    <div className="mb-1">
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
              <td className="text-center border border-black/40 px-1 py-0.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-black/60" />
              </td>
              <td className="text-center border border-black/40 px-1 py-0.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-black/60" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnswerColumn({ questions }: { questions: Array<Question> }) {
  return (
    <div className="space-y-1.5">
      {questions.map((q) =>
        matchQuestion(q, {
          mcq_single: (x) => <McqBubbleRow key={q.id} number={x.number} />,
          mcq_multi: (x) => <McqBubbleRow key={q.id} number={x.number} />,
          true_false: (x) => (
            <TrueFalseBubbleRow key={q.id} number={x.number} statementCount={x.statements.length} />
          )
        })
      )}
    </div>
  )
}

function LembarJawabanSection({
  grade,
  metadata,
  questions,
  subjectLabel,
  topicsLabel
}: {
  metadata: Pick<ExamSheetMetadata, "schoolName" | "academicYear" | "examType" | "examDate" | "durationMinutes">
  subjectLabel: string
  grade: number
  questions: Array<Question>
  topicsLabel: string
}) {
  const left = questions.slice(0, Math.ceil(questions.length / 2))
  const right = questions.slice(Math.ceil(questions.length / 2))

  return (
    <div data-print-section="lj" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <p className="text-sm font-bold uppercase tracking-wide">
            {metadata.schoolName || "SD Negeri ___________"}
          </p>
          <p className="text-base font-bold uppercase mt-1">LEMBAR JAWABAN</p>
          <p className="text-sm">
            {kopLabelFor(metadata.examType)} · {subjectLabel} — Kelas {grade} SD
          </p>
          {topicsLabel ? <p className="text-sm">{topicsLabel}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-5">
          <p>Nama : ............................................</p>
          <p>Tahun Pelajaran : {metadata.academicYear || "____/____"}</p>
          <p>No. Absen : ......................................</p>
          <p>Hari/Tanggal : {metadata.examDate || "......................"}</p>
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

function KunciSection({
  examType,
  grade,
  questions,
  subjectLabel,
  topicsLabel
}: {
  subjectLabel: string
  grade: number
  questions: Array<Question>
  examType: string
  topicsLabel: string
}) {
  const poinPerSoal = pointsPerQuestion(questions.length)
  const totalPoin = questions.length * poinPerSoal

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
          <p>
            Setiap jawaban benar bernilai <strong>{poinPerSoal} poin</strong>.
          </p>
          <p className="font-bold">Total: {totalPoin} poin</p>
        </div>
      </PaperFrame>
    </div>
  )
}

function PembahasanReadonlySection({ markdown }: { markdown: string }) {
  return (
    <div data-print-section="pembahasan" className="print-break-before">
      <PaperFrame>
        <div className="text-center border-b-2 border-black pb-3 mb-5">
          <p className="text-base font-bold uppercase">PEMBAHASAN</p>
        </div>
        <div className="prose prose-sm max-w-none text-[13px] leading-relaxed">
          <MarkdownMath markdown={markdown} />
        </div>
      </PaperFrame>
    </div>
  )
}

function ExamSheetBody({
  discussionMd,
  grade,
  metadata,
  questions,
  subjectLabel,
  topicsLabel
}: {
  grade: number
  metadata: ExamSheetMetadata
  questions: Array<Question>
  subjectLabel: string
  topicsLabel: string
  discussionMd?: string | null
}) {
  const examTypeLabel = kopLabelFor(metadata.examType)

  return (
    <>
      <SoalSection
        metadata={metadata}
        subjectLabel={subjectLabel}
        grade={grade}
        questions={questions}
        topicsLabel={topicsLabel}
      />
      <LembarJawabanSection
        metadata={metadata}
        subjectLabel={subjectLabel}
        grade={grade}
        questions={questions}
        topicsLabel={topicsLabel}
      />
      <KunciSection
        subjectLabel={subjectLabel}
        grade={grade}
        questions={questions}
        examType={examTypeLabel}
        topicsLabel={topicsLabel}
      />
      {discussionMd ? <PembahasanReadonlySection markdown={discussionMd} /> : null}
    </>
  )
}

function ExamSheetContent({
  discussionMd,
  grade,
  metadata,
  questions,
  screenTab,
  subjectLabel,
  topicsLabel
}: {
  grade: number
  metadata: ExamSheetMetadata
  questions: Array<Question>
  subjectLabel: string
  topicsLabel: string
  discussionMd?: string | null
  screenTab: "semua" | "soal" | "lj" | "kunci" | "pembahasan"
}) {
  return (
    <div data-print-content data-screen-tab={screenTab} className="space-y-6">
      <ExamSheetBody
        grade={grade}
        metadata={metadata}
        questions={questions}
        subjectLabel={subjectLabel}
        topicsLabel={topicsLabel}
        {...(discussionMd !== undefined ? { discussionMd } : {})}
      />
    </div>
  )
}

export {
  ExamSheetBody,
  ExamSheetContent,
  KunciSection,
  LembarJawabanSection,
  McqOptionsList,
  PaperFrame,
  PaperHeader,
  PembahasanReadonlySection,
  SoalSection,
  TrueFalseTable
}
