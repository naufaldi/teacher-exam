import { type Grade, phaseForGrade } from "@teacher-exam/shared"

export function parseGrade(value: string): Grade | undefined {
  const grade = Number(value)
  return isGrade(grade) ? grade : undefined
}

export function isGrade(value: number): value is Grade {
  return Number.isInteger(value) && value >= 1 && value <= 6
}

export function phaseCopyForGrade(grade: Grade | undefined): string {
  if (grade === undefined) return "Kurikulum Merdeka"
  const phase = phaseForGrade(grade)
  if (phase === "A") return "Fase A (Kelas 1–2)"
  if (phase === "B") return "Fase B (Kelas 3–4)"
  return "Fase C (Kelas 5–6)"
}

export function phaseLabelForGrade(grade: Grade | undefined): string {
  return grade === undefined ? "fase terpilih" : `Fase ${phaseForGrade(grade)}`
}
