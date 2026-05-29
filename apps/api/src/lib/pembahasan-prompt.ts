import { Match } from "effect"
import {
  buildPembahasanGradeRules,
  buildPembahasanSubjectRules,
  isKnownPembahasanSubject,
  normalizeSubjectLabel
} from "./pembahasan-subject-rules.js"
import type { BuiltPrompt } from "./prompt"
import {
  completenessBlock,
  formattingBlock,
  goalBlock,
  joinPromptSections,
  outputBlock,
  personalityBlock,
  roleBlock,
  stopRulesBlock,
  successCriteriaBlock,
  verificationBlock
} from "./prompt-blocks.js"

export interface PembahasanLegacyQuestion {
  number: number
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  topic: string
  difficulty: string
}

export interface PembahasanMcqSingleQuestion {
  _tag: "mcq_single"
  number: number
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: "a" | "b" | "c" | "d"
  topic: string | null
  difficulty: string | null
}

export interface PembahasanMcqMultiQuestion {
  _tag: "mcq_multi"
  number: number
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: ReadonlyArray<"a" | "b" | "c" | "d">
  topic: string | null
  difficulty: string | null
}

export interface PembahasanTrueFalseQuestion {
  _tag: "true_false"
  number: number
  text: string
  statements: ReadonlyArray<{ text: string; answer: boolean }>
  topic: string | null
  difficulty: string | null
}

export type PembahasanQuestion =
  | PembahasanLegacyQuestion
  | PembahasanMcqSingleQuestion
  | PembahasanMcqMultiQuestion
  | PembahasanTrueFalseQuestion

export interface BuildPembahasanInput {
  exam: {
    subject: string
    grade: number
    examType: string
  }
  questions: ReadonlyArray<PembahasanQuestion>
}

export type { BuiltPrompt }

export {
  buildGeneralPembahasanRules,
  buildPembahasanGradeRules,
  buildPembahasanSubjectRules,
  isKnownPembahasanSubject,
  normalizeSubjectLabel
} from "./pembahasan-subject-rules.js"

function isTypedQuestion(q: PembahasanQuestion): q is Exclude<PembahasanQuestion, PembahasanLegacyQuestion> {
  return "_tag" in q
}

export function serializeQuestionForPrompt(q: PembahasanQuestion) {
  if (!isTypedQuestion(q)) {
    return {
      number: q.number,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      difficulty: q.difficulty
    }
  }

  const common = {
    number: q.number,
    type: q._tag,
    text: q.text,
    topic: q.topic ?? "",
    difficulty: q.difficulty ?? ""
  }

  return Match.value(q).pipe(
    Match.tag("mcq_single", (x) => ({
      ...common,
      options: x.options,
      correct: x.correct
    })),
    Match.tag("mcq_multi", (x) => ({
      ...common,
      options: x.options,
      correct: x.correct
    })),
    Match.tag("true_false", (x) => ({
      ...common,
      statements: x.statements.map((s) => s.text),
      answers: x.statements.map((s) => (s.answer ? "B" : "S"))
    })),
    Match.exhaustive
  )
}

function buildAnswerLabelRules(): ReadonlyArray<string> {
  return [
    "Format label jawaban berdasarkan jenis soal:",
    "- Pilihan ganda biasa (mcq_single): satu huruf, contoh A.",
    "- Pilihan ganda kompleks (mcq_multi): beberapa huruf dipisah koma, contoh A, C.",
    "- Benar/Salah (true_false): urutan B/S sesuai baris pernyataan, contoh B, S, B.",
    "- Jangan mencari opsi A-D pada soal Benar/Salah. Gunakan statements dan answers.",
    "- Untuk true_false: lewati **Opsi Lain**; jelaskan tiap pernyataan di **Langkah** atau **Penjelasan**."
  ]
}

function buildOutputTemplate(): ReadonlyArray<string> {
  return [
    "Format markdown per soal (lembar dicetak untuk siswa):",
    "",
    "## {nomor}. {ringkas isi soal dalam 1 kalimat pendek}",
    "**Jawaban Benar: {label jawaban}**",
    "",
    "**Langkah:**",
    "1. {langkah konkret}",
    "2. {langkah berikutnya jika perlu}",
    "",
    "**Penjelasan:**",
    "{2–4 kalimat: mengapa jawaban benar, bahasa sesuai kelas}",
    "",
    "**Opsi Lain:** *(wajib untuk mcq_single / mcq_multi; lewati untuk true_false)*",
    "- A: … *(salah karena … — kalimat sederhana untuk siswa)*",
    "- B: …",
    "- C: …",
    "- D: …",
    "*(Hanya jelaskan opsi yang salah; opsi benar tidak perlu diulang di sini.)*",
    "",
    "**Tip:**",
    "{1–2 kalimat strategi singkat agar mudah diingat}",
    "",
    "---"
  ]
}

function buildSuccessCriteria(subject: string): ReadonlyArray<string> {
  const normalized = normalizeSubjectLabel(subject)
  const subjectAlignment = isKnownPembahasanSubject(normalized)
    ? `Pembahasan selaras aturan mata pelajaran ${normalized} (bukan aturan umum atau mapel lain).`
    : `Pembahasan mengikuti aturan umum mata pelajaran ${normalized}; jangan pakai pedagogy mapel lain (Matematika LaTeX, ide pokok BI, nilai Pancasila, dll.).`

  return [
    "Setiap soal punya **Jawaban Benar**, **Langkah**, **Penjelasan**, dan **Tip**.",
    "Soal mcq_single dan mcq_multi punya **Opsi Lain** untuk setiap distraktor yang salah.",
    "Soal true_false lewati **Opsi Lain**; jelaskan B/S per pernyataan di **Langkah** atau **Penjelasan**.",
    subjectAlignment,
    "Bahasa sesuai kedalaman kelas; tidak ada blok guru atau catatan untuk guru.",
    "Label jawaban benar sesuai jenis soal (mcq_single, mcq_multi, true_false)."
  ]
}

function buildVerificationRules(subject: string): ReadonlyArray<string> {
  const normalized = normalizeSubjectLabel(subject)
  const known = isKnownPembahasanSubject(normalized)

  const subjectCheck = Match.value(known).pipe(
    Match.when(true, () => {
      if (normalized === "Matematika") {
        return "Matematika: langkah hitung bertahap + LaTeX benar; tidak ada pedagogy mapel lain."
      }
      return `Aturan khusus ${normalized} tercermin di Langkah/Penjelasan/Opsi Lain.`
    }),
    Match.when(
      false,
      () => `Mata pelajaran umum ${normalized}: ikuti aturan umum; tidak ada LaTeX Matematika atau jargon mapel lain.`
    ),
    Match.exhaustive
  )

  return [
    "Semua nomor soal dari input sudah dibahas berurutan.",
    "Setiap soal punya Langkah, Penjelasan, Tip; Opsi Lain ada untuk MCQ, tidak untuk true_false.",
    "Label Jawaban Benar sesuai jenis soal.",
    subjectCheck,
    "Tidak ada blok guru atau catatan guru."
  ]
}

export function buildPembahasanPrompt(input: BuildPembahasanInput): BuiltPrompt {
  if (input.questions.length === 0) {
    throw new Error("buildPembahasanPrompt: questions must not be empty")
  }

  const { examType, grade, subject } = input.exam
  const questionCount = input.questions.length
  const displaySubject = normalizeSubjectLabel(subject)
  const gradeRules = buildPembahasanGradeRules(grade)
  const subjectRules = buildPembahasanSubjectRules(subject, grade)

  const system = joinPromptSections([
    roleBlock(
      `Kamu menulis lembar pembahasan untuk siswa SD kelas ${grade} — soal ${displaySubject} (${examType.toUpperCase()}). Lembar ini dicetak dan diberikan ke siswa setelah ujian agar mereka paham jawaban benar dan salah.`
    ),
    personalityBlock(
      "Ramah, jelas, sabar — seperti penjelasan teman sebaya yang mudah dipahami. Bukan kunci jawaban kering."
    ),
    goalBlock(
      `Tulis pembahasan markdown untuk SETIAP soal pada daftar JSON user (${questionCount} soal). Setiap soal wajib punya **Langkah**, **Penjelasan**, **Opsi Lain** (kecuali true_false), dan **Tip**.`
    ),
    successCriteriaBlock(buildSuccessCriteria(subject)),
    completenessBlock(questionCount, "soal"),
    formattingBlock([
      "Tulis hanya untuk siswa — lembar ini dicetak dan dibaca mandiri.",
      "Gunakan paragraf pendek; daftar bernomor di **Langkah:**; bullet di **Opsi Lain:**.",
      "Tidak boleh ada paragraf pembuka atau penutup di luar blok per-soal.",
      "Tidak boleh menyalin soal kata per kata — ringkas dengan kalimatmu sendiri.",
      "Tidak boleh ada Untuk Guru, Catatan Guru, Strategi Mengajar, atau blok serupa."
    ]),
    "Aturan bahasa:",
    `- Tulis untuk siswa kelas ${grade} SD.`,
    "- Pakai kata sehari-hari; hindari istilah akademik tinggi.",
    "- Boleh memakai contoh sederhana dari kehidupan sehari-hari.",
    "- Jawaban Benar wajib mengikuti format label jawaban sesuai jenis soal.",
    ...gradeRules,
    ...subjectRules,
    outputBlock([...buildOutputTemplate(), ...buildAnswerLabelRules()]),
    verificationBlock(buildVerificationRules(subject)),
    stopRulesBlock([
      "Setelah semua soal selesai, jangan tulis apa pun lagi.",
      "Jangan minta klarifikasi; gunakan data JSON user."
    ])
  ])

  const user = JSON.stringify(
    input.questions.map((q) => serializeQuestionForPrompt(q))
  )

  return { system, user }
}
