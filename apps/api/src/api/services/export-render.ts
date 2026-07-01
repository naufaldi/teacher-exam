import {
  type ExamWithQuestions,
  type ExportVariant,
  type PublicExamWithQuestions,
  resolveExamSubjectLabel
} from "@teacher-exam/shared"
import { Match } from "effect"
import { renderFigureSvg } from "./export-figure.js"
import { loadKatexCss } from "./export-katex-css.js"
import { renderMathText } from "./export-math.js"

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function subjectLabel(exam: ExportExam): string {
  return resolveExamSubjectLabel(exam)
}

function examTypeOf(exam: ExportExam): string {
  return exam.examType
}

function paperHeaderHtml(exam: ExportExam): string {
  const school = exam.schoolName ?? "SD Negeri ___________"
  const year = exam.academicYear ?? "____/____"
  const date = exam.examDate ?? "......................"
  const duration = exam.durationMinutes ?? 60
  const topics = exam.topics.join(" · ")
  return [
    `<div class="kop">`,
    `<p class="school">${escapeHtml(school)}</p>`,
    `<p class="title">${escapeHtml(kopLabelFor(examTypeOf(exam)))} Tahun Pelajaran ${escapeHtml(year)}</p>`,
    `</div>`,
    `<table class="meta">`,
    `<tr><td>Nama : ............................................</td><td>Mata Pelajaran : <strong>${
      escapeHtml(
        subjectLabel(exam)
      )
    }</strong></td></tr>`,
    `<tr><td>No. Absen : ......................................</td><td>Hari/Tanggal : ${escapeHtml(date)}</td></tr>`,
    `<tr><td>Kelas : ${escapeHtml(String(exam.grade))} SD</td><td>Waktu : ${
      escapeHtml(
        String(duration)
      )
    } menit</td></tr>`,
    topics ? `<tr><td colspan="2">Materi : ${escapeHtml(topics)}</td></tr>` : "",
    `</table>`
  ].join("")
}

type OptionLetter = "a" | "b" | "c" | "d"
const OPTION_LETTERS: ReadonlyArray<OptionLetter> = ["a", "b", "c", "d"]

function optionsHtml(options: { a: string; b: string; c: string; d: string }): string {
  return OPTION_LETTERS.map(
    (letter) => `<li><span class="opt-letter">${letter}.</span> <span>${renderMathText(options[letter])}</span></li>`
  ).join("")
}

function trueFalseTableHtml(statements: ReadonlyArray<{ text: string }>): string {
  const rows = statements
    .map(
      (_s, i) => `<tr><td>${i + 1}</td><td class="bs">○</td><td class="bs">○</td></tr>`
    )
    .join("")
  return `<table class="tf"><thead><tr><th>Pernyataan</th><th>B</th><th>S</th></tr></thead><tbody>${rows}</tbody></table>`
}

function questionBodyHtml(q: ExportExam["questions"][number]): string {
  return Match.value(q).pipe(
    Match.tag("mcq_single", (mcq) => `<ol class="options" type="a">${optionsHtml(mcq.options)}</ol>`),
    Match.tag("mcq_multi", (mcq) => `<ol class="options" type="a">${optionsHtml(mcq.options)}</ol>`),
    Match.tag("true_false", (tf) => trueFalseTableHtml(tf.statements)),
    Match.exhaustive
  )
}

function soalSectionHtml(exam: ExportExam): string {
  const instructions = exam.instructions
    ? `<div class="petunjuk"><p><strong>PETUNJUK PENGERJAAN:</strong></p><ol>${
      exam.instructions
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l) => `<li>${escapeHtml(l.trim())}</li>`)
        .join("")
    }</ol></div>`
    : ""
  const items = exam.questions
    .map(
      (q) =>
        `<div class="soal">` +
        `<p><span class="num">${q.number}.</span> <span class="stem">${renderMathText(q.text)}</span></p>` +
        (q.figure ? `<div class="figure">${renderFigureSvg(q.figure)}</div>` : "") +
        questionBodyHtml(q) +
        `</div>`
    )
    .join("")
  return `<section class="paper">${paperHeaderHtml(exam)}${instructions}<div class="soal-grid">${items}</div></section>`
}

function correctLabel(q: ExportExam["questions"][number]): string {
  return Match.value(q).pipe(
    Match.tag("mcq_single", (mcq) => mcq.correct.toUpperCase()),
    Match.tag("mcq_multi", (mcq) => mcq.correct.map((l) => l.toUpperCase()).join(", ")),
    Match.tag("true_false", (tf) => tf.statements.map((s) => (s.answer ? "B" : "S")).join(", ")),
    Match.exhaustive
  )
}

function kunciSectionHtml(exam: ExportExam): string {
  const cells = exam.questions
    .map(
      (q) =>
        `<div class="kunci-cell"><span class="num">${q.number}.</span><span class="ans">${
          escapeHtml(
            correctLabel(q)
          )
        }</span></div>`
    )
    .join("")
  return `<section class="paper page-break"><div class="center"><p class="title">KUNCI JAWABAN</p><p class="sub">${
    escapeHtml(
      kopLabelFor(examTypeOf(exam))
    )
  } ${escapeHtml(subjectLabel(exam))} — Kelas ${
    escapeHtml(String(exam.grade))
  } SD</p></div><div class="kunci-grid">${cells}</div></section>`
}

function pembahasanSectionHtml(exam: ExportExam): string {
  const md = exam.discussionMd
  const body = md
    ? `<div class="prose">${renderMathText(md)}</div>`
    : `<p class="muted">Pembahasan belum dibuat untuk ujian ini.</p>`
  return `<section class="paper page-break"><div class="center"><p class="title">PEMBAHASAN</p></div>${body}</section>`
}

function variantSection(exam: ExportExam, variant: ExportVariant): string {
  return Match.value(variant).pipe(
    Match.when("soal", () => soalSectionHtml(exam)),
    Match.when("kunci", () => kunciSectionHtml(exam)),
    Match.when("pembahasan", () => pembahasanSectionHtml(exam)),
    Match.exhaustive
  )
}

/**
 * Renders a self-contained HTML document for headless Chromium PDF export.
 * Pure (string in → string out) so the renderer is swappable and unit-testable.
 */
export function renderExamHtml(exam: ExportExam, variant: ExportVariant): string {
  const section = variantSection(exam, variant)
  const css = loadKatexCss()
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(exam.title)} — ${escapeHtml(variant)}</title>
<style>
${css}
* { box-sizing: border-box; }
body { margin: 0; font-family: "Lora", Georgia, "Times New Roman", serif; color: #000; background: #fff; }
.paper { width: 100%; max-width: 794px; margin: 0 auto; padding: 40px 48px; }
.page-break { page-break-before: always; }
.kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
.kop .school { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin: 0; }
.kop .title { font-size: 15px; font-weight: 700; text-transform: uppercase; margin: 4px 0 0; text-decoration: underline; }
.meta { width: 100%; font-size: 13px; margin: 0 0 16px; border-collapse: collapse; }
.meta td { padding: 2px 0; }
.petunjuk { border: 1px solid #000; padding: 10px 12px; margin: 0 0 20px; font-size: 13px; }
.petunjuk ol { margin: 4px 0 0; padding-left: 18px; }
.soal-grid { column-count: 2; column-gap: 32px; font-size: 13px; line-height: 1.5; }
.soal { break-inside: avoid; margin-bottom: 16px; }
.soal .num { font-weight: 700; margin-right: 4px; }
.options { list-style: lower-alpha; padding-left: 18px; margin: 4px 0 0; }
.options li { margin: 1px 0; }
.opt-letter { font-weight: 600; margin-right: 4px; }
.figure { text-align: center; margin: 8px 0; }
.figure svg { max-width: 240px; height: auto; }
.tf { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
.tf th, .tf td { border: 1px solid rgba(0,0,0,.4); padding: 3px 6px; text-align: center; }
.tf td:first-child { text-align: left; }
.center { text-align: center; }
.center .title { font-size: 15px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px; }
.center .sub { font-size: 13px; margin: 0; }
.kunci-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 16px; }
.kunci-cell { display: flex; justify-content: space-between; border: 1px solid rgba(0,0,0,.4); padding: 6px 8px; font-family: monospace; }
.kunci-cell .num { font-weight: 600; }
.kunci-cell .ans { font-weight: 700; }
.prose { font-size: 13px; line-height: 1.6; }
.prose p { margin: 0 0 8px; }
.muted { color: #555; font-size: 13px; }
@media print { body { background: #fff; } }
</style>
</head>
<body>
${section}
</body>
</html>`
}
