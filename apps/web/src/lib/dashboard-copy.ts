import type { CurriculumCatalogResponse, ExamSubject, Grade } from "@teacher-exam/shared"
import type { SubjectMeta } from "./subjects.js"
import { SUBJECT_OPTIONS } from "./subjects.js"

export function formatAcademicPeriod(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const semester = month >= 7 ? 1 : 2
  const startYear = semester === 1 ? year : year - 1
  const endYear = startYear + 1
  return `Tahun Pelajaran ${startYear}/${endYear} · Semester ${semester}`
}

export function readySubjectKeys(catalog: CurriculumCatalogResponse): ReadonlyArray<ExamSubject> {
  return catalog
    .filter((item) => item.grades.some((entry) => entry.availability === "ready"))
    .map((item) => item.key as ExamSubject)
}

export function readySubjectMetas(catalog: CurriculumCatalogResponse): ReadonlyArray<SubjectMeta> {
  const readyKeys = new Set(readySubjectKeys(catalog))
  return SUBJECT_OPTIONS.filter((subject) => readyKeys.has(subject.value))
}

export function readyGradeSpan(catalog: CurriculumCatalogResponse): { min: Grade; max: Grade } | null {
  const grades = catalog.flatMap((item) =>
    item.grades.filter((entry) => entry.availability === "ready").map((entry) => entry.grade as Grade)
  )
  if (grades.length === 0) return null
  return { min: Math.min(...grades) as Grade, max: Math.max(...grades) as Grade }
}

export function formatGradeSpan(span: { min: Grade; max: Grade } | null): string {
  if (span === null) return "Kelas 1–6"
  if (span.min === span.max) return `Kelas ${span.min}`
  return `Kelas ${span.min}–${span.max}`
}

export function heroCurriculumParagraph(catalog: CurriculumCatalogResponse): string {
  const subjects = readySubjectMetas(catalog)
  const labels = subjects.map((s) => s.label)
  const gradeText = formatGradeSpan(readyGradeSpan(catalog))

  if (labels.length === 0) {
    return `Siap menyiapkan lembar ujian hari ini? Kurikulum Merdeka terpasang otomatis untuk ${gradeText}.`
  }

  const mapelList = formatIndonesianList(labels)
  return `Siap menyiapkan lembar ujian hari ini? Kurikulum Merdeka sudah terpasang otomatis untuk ${mapelList} (${gradeText}).`
}

export function generateCardDescription(catalog: CurriculumCatalogResponse): string {
  const count = readySubjectMetas(catalog).length
  const gradeText = formatGradeSpan(readyGradeSpan(catalog))
  return `Satu paket soal pilihan ganda selaras Capaian Pembelajaran Kurikulum Merdeka — ${count} mapel siap generate untuk ${gradeText}.`
}

export function firstReadySubjectGrade(
  catalog: CurriculumCatalogResponse
): { subject: ExamSubject; grade: Grade } {
  for (const item of catalog) {
    const readyGrade = item.grades.find((entry) => entry.availability === "ready")
    if (readyGrade) {
      return { subject: item.key as ExamSubject, grade: readyGrade.grade as Grade }
    }
  }
  return { subject: "bahasa_indonesia", grade: 5 }
}

export function resolveTipsContext(
  catalog: CurriculumCatalogResponse,
  lastExam: { subject: ExamSubject; grade: Grade } | null
): { subject: ExamSubject; grade: Grade } {
  if (lastExam) {
    return { subject: lastExam.subject, grade: lastExam.grade }
  }
  return firstReadySubjectGrade(catalog)
}

function formatIndonesianList(items: ReadonlyArray<string>): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} dan ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`
}
