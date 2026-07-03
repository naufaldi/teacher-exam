import type { ExamType, Grade, SourceMode } from "@teacher-exam/shared"

// ── Display label maps ────────────────────────────────────────────────────────

export const KESULITAN_LABELS: Record<string, string> = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
  campuran: "Campuran"
}

export const REVIEW_MODE_LABELS: Record<string, string> = {
  fast: "Cepat",
  slow: "Detail"
}

export const SOURCE_MODE_LABELS: Record<SourceMode, string> = {
  default: "Buku Siswa",
  pdf_guru: "PDF saya saja",
  combine: "Buku Siswa + PDF saya"
}

export const PDF_REQUIRED_MESSAGE = "Pilih atau upload PDF materi guru."
export const FREE_TOPIC_REQUIRED_MESSAGE = "Topik bebas wajib diisi (minimal 10 karakter)."

// ── Jenis Lembar (PRD §8.6) ──────────────────────────────────────────────────

export interface ExamTypeOption {
  value: ExamType
  label: string
  sublabel: string
}

export const EXAM_TYPE_OPTIONS: ReadonlyArray<ExamTypeOption> = [
  { value: "latihan", label: "Latihan Soal", sublabel: "Asesmen mandiri / drill" },
  { value: "formatif", label: "Ulangan Harian", sublabel: "Asesmen Formatif" },
  { value: "sts", label: "UTS", sublabel: "Sumatif Tengah Semester" },
  { value: "sas", label: "UAS", sublabel: "Sumatif Akhir Semester" },
  { value: "tka", label: "TKA", sublabel: "Tes Kemampuan Akademik" }
] as const

export const EXAM_TYPE_LABEL_MAP: Record<ExamType, string> = Object.fromEntries(
  EXAM_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<ExamType, string>

export const FOKUS_GURU_MAX = 500
export const FALLBACK_GENERATE_GRADES: ReadonlyArray<Grade> = [1, 2, 3, 4, 5, 6]

// ── Default total soal per jenis (PRD §8.x) ───────────────────────────────────

export const DEFAULT_TOTAL_SOAL: Record<string, number> = {
  latihan: 20,
  formatif: 20,
  sts: 25,
  sas: 25,
  tka: 25
}

// ── Default composition per jenis (Task 5 profile defaults) ──────────────────

export type Composition = { mcqSingle: number; mcqMulti: number; trueFalse: number }

export const DEFAULT_COMPOSITION_BY_JENIS = {
  latihan: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  formatif: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  sts: { mcqSingle: 18, mcqMulti: 4, trueFalse: 3 },
  sas: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 },
  tka: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 }
} as const satisfies Record<ExamType, Composition>

export function rescaleComposition(profileComp: Composition, oldTotal: number, newTotal: number): Composition {
  const mcqSingle = Math.round(profileComp.mcqSingle / oldTotal * newTotal)
  const mcqMulti = Math.round(profileComp.mcqMulti / oldTotal * newTotal)
  const trueFalse = Math.max(0, newTotal - mcqSingle - mcqMulti)
  return { mcqSingle, mcqMulti, trueFalse }
}

// Budget for the elapsed-time animation. Real Claude calls run 25–60s;
// 45s keeps the bar crawling through ~P75 without freezing early.
export const GENERATE_DURATION_MS = 45000
