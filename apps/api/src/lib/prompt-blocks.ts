/** GPT-5.4-style modular prompt sections (provider-agnostic). */

export function joinPromptSections(
  sections: ReadonlyArray<string | ReadonlyArray<string> | undefined>
): string {
  const lines: Array<string> = []
  for (const section of sections) {
    if (section === undefined || section === "") continue
    if (typeof section === "string") {
      lines.push(section)
      continue
    }
    for (const line of section) {
      if (line !== "") lines.push(line)
    }
  }
  return lines.join("\n")
}

export function roleBlock(text: string): string {
  return `# Peran\n${text}`
}

export function goalBlock(text: string): string {
  return `# Tujuan\n${text}`
}

export function successCriteriaBlock(lines: ReadonlyArray<string>): string {
  return `# Kriteria keberhasilan\n${lines.map((line) => `- ${line}`).join("\n")}`
}

export function groundingBlock(): string {
  return [
    "# Grounding",
    "- Korpus Buku Siswa di bawah adalah sumber otoritatif untuk CP/TP, bab, dan sub-konsep.",
    "- Basis klaim hanya dari korpus dan parameter user — jangan mengarang CP/TP di luar korpus.",
    "- Jika bukti kurikulum tidak cukup, tetap buat soal yang selaras topik dan tandai konteks dari parameter user."
  ].join("\n")
}

export function corpusBlock(curriculumText: string): string {
  return [
    "--- KORPUS BUKU SISWA (Kurikulum Merdeka, Fase C) ---",
    curriculumText,
    "--- AKHIR KORPUS ---"
  ].join("\n")
}

export function authorityOrderBlock(sourceMode: "default" | "pdf_guru" | "combine" = "default"): string {
  if (sourceMode === "pdf_guru") {
    return [
      "Authority order:",
      "  1. PDF materi guru terlampir = sumber utama soal.",
      "  2. Parameter topik bebas guru menentukan fokus materi."
    ].join("\n")
  }
  if (sourceMode === "combine") {
    return [
      "Authority order:",
      "  1. Korpus Buku Siswa di bawah = baseline kurikulum (otoritatif untuk CP, daftar bab, sub-konsep).",
      "  2. PDF materi guru terlampir = konteks tambahan — bukan pengganti korpus."
    ].join("\n")
  }
  return [
    "Authority order:",
    "  1. Korpus Buku Siswa di bawah = baseline kurikulum (otoritatif untuk CP, daftar bab, sub-konsep, teks bacaan, dan kosakata).",
    "  2. PDF guru (jika ada di user message sebagai document block) = konteks tambahan untuk memperkaya soal — bukan pengganti korpus."
  ].join("\n")
}

export function structuredJsonOutputBlock(): string {
  return [
    "# Kontrak output JSON",
    "- Jawab HANYA dengan JSON array yang valid — tanpa prosa, tanpa pembungkus markdown.",
    "- Semua nilai string WAJIB memakai tanda kutip ganda valid JSON.",
    "- Sebelum mengirim, pastikan array dapat di-parse dan memenuhi skema di bagian Output.",
    "- Setelah JSON final valid, jangan tulis apa pun lagi."
  ].join("\n")
}

export function completenessBlock(expectedCount: number, itemLabel: string): string {
  return [
    "# Kelengkapan",
    `- Tugas belum selesai sampai semua ${expectedCount} ${itemLabel} tercakup.`,
    "- Jangan lewati nomor; ikuti urutan nomor dari kecil ke besar.",
    "- Satu entri output per nomor input."
  ].join("\n")
}

export function verificationBlock(lines: ReadonlyArray<string>): string {
  const numbered = lines.map((line, index) => `${index + 1}. ${line}`).join("\n")
  return `# Verifikasi (internal — jangan tampilkan)\nSebelum mengirim output final:\n${numbered}`
}

export function stopRulesBlock(lines: ReadonlyArray<string>): string {
  return `# Aturan berhenti\n${lines.map((line) => `- ${line}`).join("\n")}`
}

export function personalityBlock(text: string): string {
  return `# Personality\n${text}`
}

export function formattingBlock(lines: ReadonlyArray<string>): string {
  return `# Format\n${lines.map((line) => `- ${line}`).join("\n")}`
}

export function outputBlock(lines: ReadonlyArray<string>): string {
  return ["# Output", ...lines].join("\n")
}
