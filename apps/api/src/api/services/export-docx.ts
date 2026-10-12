import {
  type ExamWithQuestions,
  type ExportVariant,
  formatMcqOption,
  type McqOptionLetter,
  type PublicExamWithQuestions,
  resolveExamSubjectLabel,
  resolveHeaderKop,
  SHEET_CREDIT
} from "@teacher-exam/shared"
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun
} from "docx"
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

const LOGO_DATA_URL = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/

function logoRun(dataUrl: string | null): ImageRun | null {
  if (dataUrl === null) return null
  const match = LOGO_DATA_URL.exec(dataUrl)
  const kind = match?.[1]
  const bytes = match?.[2]
  if (kind === undefined || bytes === undefined) return null
  return new ImageRun({
    type: kind === "png" ? "png" : "jpg",
    data: Buffer.from(bytes, "base64"),
    transformation: { width: 64, height: 64 }
  })
}

function headerParagraphs(exam: ExportExam): Array<Paragraph> {
  const kop = resolveHeaderKop({
    schoolName: exam.schoolName,
    kop: Object.hasOwn(exam, "kop") ? Reflect.get(exam, "kop") : undefined
  })
  const image = logoRun(kop.logoDataUrl)
  return [
    ...(image === null
      ? []
      : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [image]
        })
      ]),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: kop.name, bold: true })]
    }),
    ...(kop.address === ""
      ? []
      : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: kop.address })]
        })
      ]),
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
  const row = (letter: McqOptionLetter) => {
    const option = formatMcqOption(letter, options[letter])
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 24, type: "pct" },
          children: [new Paragraph(option.label)]
        }),
        new TableCell({ children: [new Paragraph(plainText(option.text))] })
      ]
    })
  }
  return new Table({
    width: { size: 100, type: "pct" },
    rows: (["a", "b", "c", "d"] as const).map((letter) => row(letter))
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

function textCell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold })] })]
  })
}

function headerRow(labels: ReadonlyArray<string>): TableRow {
  return new TableRow({
    tableHeader: true,
    children: labels.map((label) => textCell(label, true))
  })
}

function questionTypeLabel(q: ExportExam["questions"][number]): string {
  return Match.value(q).pipe(
    Match.tag("mcq_single", () => "Pilihan ganda"),
    Match.tag("mcq_multi", () => "Pilihan ganda kompleks"),
    Match.tag("true_false", () => "Benar/Salah"),
    Match.exhaustive
  )
}

function readOptionalText(q: object, key: string): string | undefined {
  if (!Object.hasOwn(q, key)) return undefined
  const value = (q as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

/** Columns that only appear when at least one stored question carries the code. */
function optionalCodeColumns(exam: ExportExam): Array<{ key: string; label: string }> {
  const candidates = [
    { key: "cp", label: "CP" },
    { key: "tp", label: "TP" },
    { key: "cognitive_level", label: "Level kognitif" }
  ]
  return candidates.filter((column) => exam.questions.some((q) => readOptionalText(q, column.key) !== undefined))
}

function titledRows(title: string, exam: ExportExam, rows: Array<TableRow>): Array<Paragraph | Table> {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`${subjectLabel(exam)} — Kelas ${exam.grade} SD`)]
    }),
    new Paragraph({ text: "" }),
    new Table({ width: { size: 100, type: "pct" }, rows })
  ]
}

function kisiKisiChildren(exam: ExportExam): Array<Paragraph | Table> {
  const extra = optionalCodeColumns(exam)
  const rows = [
    headerRow(["No", "Soal", "Tipe", "Level", "Topik", ...extra.map((column) => column.label)]),
    ...exam.questions.map(
      (q) =>
        new TableRow({
          children: [
            textCell(String(q.number)),
            textCell(plainText(q.text)),
            textCell(questionTypeLabel(q)),
            textCell(q.difficulty ?? ""),
            textCell(q.topic ?? ""),
            ...extra.map((column) => textCell(readOptionalText(q, column.key) ?? ""))
          ]
        })
    )
  ]
  return titledRows("KISI-KISI", exam, rows)
}

function kartuSoalChildren(exam: ExportExam): Array<Paragraph | Table> {
  const rows = [
    headerRow(["No", "Soal", "Kunci"]),
    ...exam.questions.map(
      (q) =>
        new TableRow({
          children: [
            textCell(String(q.number)),
            textCell(plainText(q.text)),
            textCell(correctLabel(q), true)
          ]
        })
    )
  ]
  return titledRows("KARTU SOAL", exam, rows)
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
    Match.when("kisi_kisi", () => kisiKisiChildren(exam)),
    Match.when("kartu_soal", () => kartuSoalChildren(exam)),
    Match.exhaustive
  )
}

function sheetCreditParagraphs(): Array<Paragraph> {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360 },
      children: [
        new ExternalHyperlink({
          link: SHEET_CREDIT.url,
          children: [new TextRun({ text: SHEET_CREDIT.sentence, style: "Hyperlink" })]
        })
      ]
    })
  ]
}

/** Builds a DOCX file from an exam + variant and returns its bytes. */
export async function renderExamDocx(exam: ExportExam, variant: ExportVariant): Promise<Uint8Array> {
  const doc = new Document({
    sections: [{ children: [...variantChildren(exam, variant), ...sheetCreditParagraphs()] }]
  })
  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
