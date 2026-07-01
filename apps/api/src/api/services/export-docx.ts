import {
  type ExamWithQuestions,
  type ExportVariant,
  type PublicExamWithQuestions,
  resolveExamSubjectLabel
} from "@teacher-exam/shared"
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx"
import { Match } from "effect"

type ExportExam = ExamWithQuestions | PublicExamWithQuestions

const EXAM_TYPE_KOP_LABELS: Record<string, string> = {
  latihan: "LATIHAN SOAL",
  formatif: "ULANGAN HARIAN",
  sts: "PENILAIAN TENGAH SEMESTER",
  sas: "PENILAIAN AKHIR SEMESTER",
  tka: "TKA"
}

function kopLabelFor(examType: string): string {
  return EXAM_TYPE_KOP_LABELS[examType] ?? examType.toUpperCase()
}

function subjectLabel(exam: ExportExam): string {
  return resolveExamSubjectLabel(exam)
}

function plainText(text: string): string {
  // DOCX runs are plain text — strip math delimiters to a readable plain form.
  return text.replaceAll(/\$+/g, "")
}

function headerParagraphs(exam: ExportExam): Array<Paragraph> {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: exam.schoolName ?? "SD Negeri ___________", bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${kopLabelFor(exam.examType)} Tahun Pelajaran ${exam.academicYear ?? "____/____"}`,
          bold: true
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${subjectLabel(exam)} — Kelas ${exam.grade} SD` })]
    }),
    new Paragraph({ text: "" })
  ]
}

function mcqOptionsTable(options: { a: string; b: string; c: string; d: string }): Table {
  const row = (letter: string, text: string) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 24, type: "pct" }, children: [new Paragraph(`${letter}.`)] }),
        new TableCell({ children: [new Paragraph(plainText(text))] })
      ]
    })
  return new Table({
    width: { size: 100, type: "pct" },
    rows: ["a", "b", "c", "d"].map((l) => row(l, options[l as "a" | "b" | "c" | "d"]))
  })
}

function trueFalseTable(statements: ReadonlyArray<{ text: string }>): Table {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Pernyataan", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "B", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S", bold: true })] })] })
      ]
    }),
    ...statements.map(
      (s) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(plainText(s.text))] }),
            new TableCell({ children: [new Paragraph("○")] }),
            new TableCell({ children: [new Paragraph("○")] })
          ]
        })
    )
  ]
  return new Table({ width: { size: 100, type: "pct" }, rows })
}

function soalChildren(exam: ExportExam): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [...headerParagraphs(exam)]
  for (const q of exam.questions) {
    children.push(new Paragraph({ text: `${q.number}. ${plainText(q.text)}`, spacing: { before: 120 } }))
    if (q._tag === "mcq_single" || q._tag === "mcq_multi") {
      children.push(mcqOptionsTable(q.options))
    } else if (q._tag === "true_false") {
      children.push(trueFalseTable(q.statements))
    }
  }
  return children
}

function correctLabel(q: ExportExam["questions"][number]): string {
  return Match.value(q).pipe(
    Match.tag("mcq_single", (mcq) => mcq.correct.toUpperCase()),
    Match.tag("mcq_multi", (mcq) => mcq.correct.map((l) => l.toUpperCase()).join(", ")),
    Match.tag("true_false", (tf) => tf.statements.map((s) => (s.answer ? "B" : "S")).join(", ")),
    Match.exhaustive
  )
}

function kunciChildren(exam: ExportExam): Array<Paragraph | Table> {
  const cells = exam.questions.map(
    (q) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${q.number}.`, bold: true })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: correctLabel(q), bold: true })] })]
          })
        ]
      })
  )
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "KUNCI JAWABAN", bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`${subjectLabel(exam)} — Kelas ${exam.grade} SD`)]
    }),
    new Paragraph({ text: "" }),
    new Table({ width: { size: 60, type: "pct" }, rows: cells })
  ]
}

function pembahasanChildren(exam: ExportExam): Array<Paragraph | Table> {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PEMBAHASAN", bold: true })]
    }),
    new Paragraph({
      text: exam.discussionMd ? plainText(exam.discussionMd) : "Pembahasan belum dibuat untuk ujian ini."
    })
  ]
}

function variantChildren(
  exam: ExportExam,
  variant: ExportVariant
): Array<Paragraph | Table> {
  return Match.value(variant).pipe(
    Match.when("soal", () => soalChildren(exam)),
    Match.when("kunci", () => kunciChildren(exam)),
    Match.when("pembahasan", () => pembahasanChildren(exam)),
    Match.exhaustive
  )
}

/** Builds a DOCX file from an exam + variant and returns its bytes. */
export async function renderExamDocx(exam: ExportExam, variant: ExportVariant): Promise<Uint8Array> {
  const doc = new Document({
    sections: [{ children: variantChildren(exam, variant) }]
  })
  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
