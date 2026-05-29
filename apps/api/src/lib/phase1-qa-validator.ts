import type { ExamSubject, Question } from "@teacher-exam/shared"

const PLACEHOLDER_STUB = "Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang."

const MIN_STEM_LENGTH = 20

const INDONESIAN_MARKERS =
  /\b(yang|dan|di|pada|manakah|berikut|adalah|dengan|dari|untuk|pilihlah|soal|baca|perhatikan|jelaskan|dalam|tidak|adakah|apakah|manakah|sumber|paling|siang|malam|kegiatan|dilakukan|setiap|sebelum|sesudah)\b/i

const ENGLISH_MARKERS =
  /\b(what|which|how|when|where|why|who|choose|read|complete|fill|circle|write|the|is|are|was|were|does|do|did|can|could|should|would|have|has|this|that|these|those|every|before|after|during|school|morning|afternoon|activity|activities|student|students|teacher|english|answer|question|best|correct|following|sentence|paragraph|story|experience|health|safety|direction|invitation|future|plan|plans)\b/i

function hasIndonesianMarkers(text: string): boolean {
  return INDONESIAN_MARKERS.test(text)
}

function hasEnglishMarkers(text: string): boolean {
  return ENGLISH_MARKERS.test(text)
}

export type Phase1QaValidation = {
  pass: boolean
  reason: string | null
}

export function englishRatio(text: string): number {
  const words = text.match(/[A-Za-z]+/g) ?? []
  if (words.length === 0) return 0
  const ascii = words.filter((w) => /^[A-Za-z]+$/.test(w)).length
  return ascii / words.length
}

function optionTexts(question: Extract<Question, { _tag: "mcq_single" }>): ReadonlyArray<string> {
  return [
    question.options.a,
    question.options.b,
    question.options.c,
    question.options.d
  ]
}

function hasDistinctOptions(options: ReadonlyArray<string>): boolean {
  const normalized = options.map((o) => o.trim().toLowerCase())
  return new Set(normalized).size === options.length
}

export function validatePhase1Question(
  question: Question,
  subject: Extract<ExamSubject, "ipas" | "bahasa_inggris">
): Phase1QaValidation {
  if (question._tag !== "mcq_single") {
    return { pass: false, reason: "Only mcq_single is supported for Phase 1 QA" }
  }

  if (question.generationFailed === true || question.text.includes(PLACEHOLDER_STUB)) {
    return { pass: false, reason: "Generation failed or placeholder stub" }
  }

  if (question.text.trim().length < MIN_STEM_LENGTH) {
    return { pass: false, reason: `Stem too short (min ${MIN_STEM_LENGTH} chars)` }
  }

  if (!question.topic?.trim()) {
    return { pass: false, reason: "Missing topic" }
  }

  const options = optionTexts(question)
  if (options.some((o) => o.trim().length === 0)) {
    return { pass: false, reason: "Empty option text" }
  }

  if (!hasDistinctOptions(options)) {
    return { pass: false, reason: "Options must be distinct" }
  }

  if (question.validationStatus === "needs_review") {
    return { pass: false, reason: question.validationReason ?? "Needs review" }
  }

  const stemEn = englishRatio(question.text)
  const optionsEn = englishRatio(options.join(" "))

  if (subject === "bahasa_inggris") {
    if (hasIndonesianMarkers(question.text) && !hasEnglishMarkers(question.text)) {
      return { pass: false, reason: "Bahasa Inggris stem should be mostly English" }
    }
    if (!hasEnglishMarkers(question.text) && stemEn < 0.55) {
      return { pass: false, reason: "Bahasa Inggris stem should be mostly English" }
    }
    if (hasIndonesianMarkers(options.join(" ")) && !hasEnglishMarkers(options.join(" "))) {
      return { pass: false, reason: "Bahasa Inggris options should be mostly English" }
    }
    if (!hasEnglishMarkers(options.join(" ")) && optionsEn < 0.55) {
      return { pass: false, reason: "Bahasa Inggris options should be mostly English" }
    }
  }

  if (subject === "ipas") {
    if (hasEnglishMarkers(question.text) && !hasIndonesianMarkers(question.text)) {
      return { pass: false, reason: "IPAS stem should be mostly Indonesian" }
    }
  }

  return { pass: true, reason: null }
}
