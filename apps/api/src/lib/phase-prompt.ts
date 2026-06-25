import { type Grade, phaseForGrade } from "@teacher-exam/shared"

export function isGrade(value: number): value is Grade {
  return Number.isInteger(value) && value >= 1 && value <= 6
}

export function phaseRoleCopyForGrade(grade: number): string {
  if (!isGrade(grade)) return `kelas ${grade}`
  const phase = phaseForGrade(grade)
  return `Fase ${phase} (Kelas ${grade})`
}

export function gradeAppropriatenessRules(grade: number): ReadonlyArray<string> {
  if (grade <= 2) {
    return [
      "Aturan tingkat kelas rendah:",
      "- Gunakan kalimat pendek dan kosakata konkret yang sesuai anak kelas 1–2.",
      "- Hindari bacaan panjang; jika perlu teks bacaan, buat 1–3 kalimat sederhana.",
      "- Gunakan konteks dekat dengan anak: rumah, sekolah, teman, keluarga, permainan, benda sekitar.",
      "- Hindari penalaran abstrak yang belum cocok untuk pembaca awal."
    ]
  }
  if (grade <= 4) {
    return [
      "Aturan tingkat kelas menengah:",
      "- Gunakan kalimat jelas dengan konteks sehari-hari yang masih konkret.",
      "- Boleh gunakan bacaan pendek 1–2 paragraf, tetapi jangan terlalu padat.",
      "- Sesuaikan tuntutan analisis dengan Fase B."
    ]
  }
  return [
    "Aturan tingkat kelas tinggi:",
    "- Gunakan tuntutan pemahaman dan analisis yang sesuai Fase C.",
    "- Boleh gunakan bacaan lebih panjang selama tetap sesuai tingkat SD."
  ]
}
