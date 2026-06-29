import type { ExamType } from "@teacher-exam/shared"

const EXAM_TYPE_KOP_LABELS: Record<ExamType, string> = {
  latihan: "LATIHAN SOAL",
  formatif: "ULANGAN HARIAN",
  sts: "PENILAIAN TENGAH SEMESTER",
  sas: "PENILAIAN AKHIR SEMESTER",
  tka: "TKA"
}

function kopLabelFor(examType: string): string {
  return EXAM_TYPE_KOP_LABELS[examType as ExamType] ?? examType.toUpperCase()
}

export { kopLabelFor }
