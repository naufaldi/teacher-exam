import type { ExamDifficulty, ExamSubject, ExamType } from "@teacher-exam/shared"
import type { Composition } from "./exam-type-profile"
import { EXAM_TYPE_PROFILE, resolveDifficultyDist } from "./exam-type-profile"
import { buildMatematikaLatexPromptRules } from "./matematika-latex-prompt.js"
import { gradeAppropriatenessRules, phaseRoleCopyForGrade } from "./phase-prompt.js"
import {
  authorityOrderBlock,
  corpusBlock,
  goalBlock,
  groundingBlock,
  joinPromptSections,
  outputBlock,
  roleBlock,
  stopRulesBlock,
  structuredJsonOutputBlock,
  successCriteriaBlock,
  verificationBlock
} from "./prompt-blocks.js"

export interface BuildPromptInput {
  examType: ExamType
  difficulty: ExamDifficulty
  examSubject?: ExamSubject | undefined
  subjectLabel: string
  grade: number
  /** One or more topics for the paper. AI distributes questions evenly across them when multiple are given. */
  topics: Array<string>
  totalSoal: number
  /** Full markdown curriculum corpus sent as the system-message baseline. */
  curriculumText: string
  sourceMode?: "default" | "pdf_guru" | "combine"
  classContext?: string | undefined
  exampleQuestions?: string | undefined
  composition?: Composition | undefined
}

export interface BuildRegeneratePromptInput {
  grade: number
  subjectLabel: string
  examSubject?: ExamSubject | undefined
  topic: string
  difficulty: string
  siblingTexts: ReadonlyArray<string>
  hint?: string | undefined
  curriculumText?: string | undefined
}

export interface BuiltPrompt {
  /** Sent as the provider `system` field — baseline grounding + output rules. */
  system: string
  /** Sent as the user message text block — task-specific parameters. */
  user: string
}

const MCQ_SINGLE_EXAMPLE =
  "{ \"_tag\": \"mcq_single\", \"number\": 1, \"text\": \"Berapakah hasil dari $12 \\\\times 5$?\", \"option_a\": \"50\", \"option_b\": \"60\", \"option_c\": \"70\", \"option_d\": \"80\", \"correct_answer\": \"b\", \"topic\": \"Operasi Hitung\", \"difficulty\": \"mudah\", \"cognitive_level\": \"C2\" }"

const BAB_TOPIC_PATTERN = /^Bab \d+:/

export function isBabTopic(topic: string): boolean {
  return BAB_TOPIC_PATTERN.test(topic.trim())
}

function buildTopicsInstruction(topics: ReadonlyArray<string>, totalSoal: number): string {
  const allBabTopics = topics.length > 0 && topics.every((topic) => isBabTopic(topic))

  if (allBabTopics && topics.length === 1) {
    return "Hanya gunakan konten dari Bab yang dipilih. Jangan mengambil materi dari Bab lain di korpus."
  }

  if (allBabTopics && topics.length > 1) {
    return `Distribusikan soal secara merata di antara semua Bab yang dipilih (sekitar ${
      Math.round(totalSoal / topics.length)
    } soal per Bab). Setiap soal harus berasal dari salah satu Bab yang dipilih saja dan mencantumkan nama Bab-nya di field "topic".`
  }

  if (topics.length > 1) {
    return `Distribusikan soal secara merata di antara semua topik (sekitar ${
      Math.round(totalSoal / topics.length)
    } soal per topik). Setiap soal harus mencantumkan nama topiknya di field "topic".`
  }

  return "Topik bersifat directive (fokus utama), bukan filter — Anda boleh mengambil konteks dari bab manapun di korpus selama relevan dengan topik."
}

function buildBahasaInggrisRules(): ReadonlyArray<string> {
  return [
    "Bahasa Inggris language rules:",
    "- Tulis field \"text\" (stem soal) dan semua \"option_*\" dalam Bahasa Inggris sederhana (SD kelas 5–6).",
    "- Field \"topic\" boleh mengikuti topik yang dipilih guru (Bahasa Indonesia atau Inggris).",
    "- Jangan menulis stem atau opsi dalam Bahasa Indonesia, kecuali nama diri atau kutipan singkat dari bacaan."
  ]
}

function buildQuestionShapeOutputLines(totalSoal: number): ReadonlyArray<string> {
  return [
    "Skema setiap soal (field \"_tag\" menentukan jenis):",
    `- Setiap soal WAJIB memiliki field "number" berurutan dari 1 sampai ${totalSoal}.`,
    "",
    "  1. Pilihan Ganda (mcq_single):",
    "     { \"_tag\": \"mcq_single\", \"number\": 1, \"text\": \"...\", \"option_a\": \"...\", \"option_b\": \"...\", \"option_c\": \"...\", \"option_d\": \"...\", \"correct_answer\": \"a|b|c|d\", \"topic\": \"...\", \"difficulty\": \"mudah|sedang|sulit\", \"cognitive_level\": \"C1|C2|C3|C4\" }",
    "",
    "  2. Pilihan Ganda Kompleks (mcq_multi) — pilih 2–3 jawaban benar:",
    "     { \"_tag\": \"mcq_multi\", \"number\": 2, \"text\": \"...(awali dengan 'Pilih dua/tiga jawaban yang benar!')\", \"option_a\": \"...\", \"option_b\": \"...\", \"option_c\": \"...\", \"option_d\": \"...\", \"correct_answers\": [\"a\", \"c\"], \"topic\": \"...\", \"difficulty\": \"mudah|sedang|sulit\", \"cognitive_level\": \"C1|C2|C3|C4\" }",
    "     Catatan: correct_answers adalah array 2–3 huruf unik (a/b/c/d).",
    "",
    "  3. Benar/Salah (true_false) — tabel pernyataan:",
    "     { \"_tag\": \"true_false\", \"number\": 3, \"text\": \"Tentukan apakah pernyataan berikut benar (B) atau salah (S):\", \"statements\": [{ \"text\": \"...\", \"answer\": \"B\" }, { \"text\": \"...\", \"answer\": \"S\" }], \"topic\": \"...\", \"difficulty\": \"mudah|sedang|sulit\", \"cognitive_level\": \"C1|C2|C3|C4\" }",
    "     Catatan: statements berisi 3–4 pernyataan; answer adalah \"B\" atau \"S\".",
    "",
    "- Untuk topik geometri/diagram (misalnya Bangun Datar, Bangun Ruang, Bidang Koordinat), setiap soal BOLEH memiliki field opsional \"figure\".",
    "  Jangan isi \"figure\" untuk soal non-diagram.",
    "  Bentuk \"figure\" yang didukung hanya:",
    "  - circle: { \"type\": \"circle\", \"radius\": 7, \"label\": \"r = 7 cm\" }",
    "  - square: { \"type\": \"square\", \"side\": 8, \"label\": \"s = 8 cm\" }",
    "  - rectangle: { \"type\": \"rectangle\", \"width\": 12, \"height\": 5, \"label\": \"12 cm x 5 cm\" }",
    "  - triangle: { \"type\": \"triangle\", \"base\": 10, \"height\": 6, \"label\": \"a = 10 cm, t = 6 cm\" }",
    "  - trapezoid: { \"type\": \"trapezoid\", \"topBase\": 6, \"bottomBase\": 12, \"height\": 4, \"label\": \"t = 4 cm\" }",
    "  - coordinate_plane: { \"type\": \"coordinate_plane\", \"xMin\": -2, \"xMax\": 4, \"yMin\": -1, \"yMax\": 5, \"points\": [{ \"x\": 1, \"y\": 2, \"label\": \"A\" }] }",
    "",
    "Contoh minimal mcq_single (format benar):",
    `  ${MCQ_SINGLE_EXAMPLE}`
  ]
}

export function buildExamPrompt(input: BuildPromptInput): BuiltPrompt {
  const profile = EXAM_TYPE_PROFILE[input.examType]
  if (input.topics.length === 0) {
    throw new Error("buildExamPrompt: topics must contain at least one item")
  }
  const dist = resolveDifficultyDist(input.examType, input.difficulty, input.totalSoal)
  const matematikaRules = input.subjectLabel === "Matematika" ? [...buildMatematikaLatexPromptRules()] : []

  const bahasaInggrisRules = input.examSubject === "bahasa_inggris" ? buildBahasaInggrisRules() : []
  const gradeRules = gradeAppropriatenessRules(input.grade)

  const comp = input.composition ?? { mcqSingle: input.totalSoal, mcqMulti: 0, trueFalse: 0 }

  const sourceMode = input.sourceMode ?? "default"
  const includeCorpus = sourceMode !== "pdf_guru"
  const corpusSections = includeCorpus && input.curriculumText.trim() !== ""
    ? [groundingBlock(), authorityOrderBlock(sourceMode), corpusBlock(input.curriculumText)]
    : sourceMode === "pdf_guru"
    ? [
      "# Grounding",
      "- PDF materi guru terlampir adalah sumber utama soal.",
      "- Jangan mengutip Capaian Pembelajaran resmi yang tidak ada di PDF.",
      authorityOrderBlock(sourceMode)
    ]
    : [groundingBlock(), authorityOrderBlock(sourceMode)]
  const system = joinPromptSections([
    roleBlock(
      `Anda adalah generator soal ulangan SD untuk Kurikulum Merdeka ${phaseRoleCopyForGrade(input.grade)}.`
    ),
    goalBlock(
      `Hasilkan tepat ${input.totalSoal} soal sesuai composition_soal, distribusi kesulitan, dan level kognitif jenis lembar ini.`
    ),
    successCriteriaBlock([
      `JSON array valid berisi tepat ${input.totalSoal} soal — tanpa prosa di luar JSON.`,
      "Field \"number\" berurutan 1..N; \"_tag\" sesuai composition_soal.",
      "Field difficulty dan cognitive_level sesuai batas jenis lembar.",
      "Field \"topic\" mengikuti instruksi topik (tunggal atau multi-topik).",
      "Semua nilai string memakai tanda kutip ganda valid JSON."
    ]),
    structuredJsonOutputBlock(),
    ...corpusSections,
    profile.promptPreamble,
    "",
    ...bahasaInggrisRules,
    ...matematikaRules,
    ...gradeRules,
    "",
    `- Gaya soal: ${profile.stemHint}`,
    `- Hormati distribusi kesulitan target dan level kognitif yang diizinkan untuk jenis lembar ini.`,
    outputBlock(buildQuestionShapeOutputLines(input.totalSoal)),
    verificationBlock([
      "Hitung elemen array — harus tepat jumlah soal diminta.",
      "Pastikan setiap \"_tag\", correct_answer/correct_answers, dan statements valid.",
      "Periksa escape backslash LaTeX ganda di JSON Matematika.",
      "Pastikan distribusi kesulitan dan composition_soal sesuai parameter user."
    ]),
    stopRulesBlock([
      "Setelah array JSON valid, jangan tulis apa pun lagi.",
      "Jangan minta klarifikasi; gunakan parameter user dan korpus."
    ])
  ])

  const topicsLabel = input.topics.length === 1
    ? (input.topics[0] ?? "")
    : input.topics.map((t, i) => `${i + 1}. ${t}`).join("\n")

  const topicsInstruction = buildTopicsInstruction(input.topics, input.totalSoal)

  const typeParts: Array<string> = []
  if (comp.mcqSingle > 0) typeParts.push(`${comp.mcqSingle} soal pilihan ganda`)
  if (comp.mcqMulti > 0) typeParts.push(`${comp.mcqMulti} soal pilihan ganda kompleks`)
  if (comp.trueFalse > 0) typeParts.push(`${comp.trueFalse} soal benar/salah`)
  const compositionSentence = `Buatkan satu lembar berisi ${
    typeParts.join(", ")
  } (total ${input.totalSoal} soal) berdasarkan parameter berikut.`

  const params: Record<string, unknown> = {
    kelas: input.grade,
    mata_pelajaran: input.subjectLabel,
    topik: topicsLabel,
    jenis_lembar: input.examType,
    jumlah_soal: input.totalSoal,
    distribusi_kesulitan: dist,
    level_kognitif: profile.cognitiveLevels,
    composition_soal: {
      mcq_single: comp.mcqSingle,
      mcq_multi: comp.mcqMulti,
      true_false: comp.trueFalse
    }
  }
  if (input.classContext && input.classContext.trim() !== "") {
    params["konteks_guru"] = input.classContext.trim()
  }
  if (input.exampleQuestions && input.exampleQuestions.trim() !== "") {
    params["contoh_soal"] = input.exampleQuestions.trim()
  }

  const pdfAttachmentLine = sourceMode === "pdf_guru"
    ? "Gunakan PDF materi guru terlampir sebagai sumber utama soal."
    : sourceMode === "combine"
    ? "Jika ada PDF materi guru terlampir, gunakan sebagai konteks tambahan; korpus Buku Siswa tetap otoritatif."
    : "Jika ada PDF materi guru terlampir di pesan ini, gunakan sebagai sumber tambahan untuk konteks lokal/terkini."

  const user = [
    compositionSentence,
    topicsInstruction,
    pdfAttachmentLine,
    "",
    JSON.stringify(params, null, 2)
  ].join("\n")

  return { system, user }
}

export function buildRegeneratePrompt(input: BuildRegeneratePromptInput): BuiltPrompt {
  const isMatematika = input.subjectLabel === "Matematika"
  const matematikaRules = isMatematika ? [...buildMatematikaLatexPromptRules()] : []
  const bahasaInggrisRules = input.examSubject === "bahasa_inggris" ? buildBahasaInggrisRules() : []

  const corpusSections = input.curriculumText && input.curriculumText.trim() !== ""
    ? [groundingBlock(), authorityOrderBlock(), corpusBlock(input.curriculumText.trim())]
    : [groundingBlock()]

  const system = joinPromptSections([
    roleBlock(
      `Anda adalah generator soal ulangan SD untuk Kurikulum Merdeka ${phaseRoleCopyForGrade(input.grade)}.`
    ),
    goalBlock("Hasilkan tepat 1 soal pilihan ganda (mcq_single) pengganti yang berbeda dari soal yang ada."),
    successCriteriaBlock([
      "JSON array valid berisi tepat 1 objek mcq_single.",
      "Stem dan opsi tidak mirip daftar hindari_soal_mirip.",
      "Semua nilai string memakai tanda kutip ganda valid JSON."
    ]),
    structuredJsonOutputBlock(),
    ...corpusSections,
    ...bahasaInggrisRules,
    ...matematikaRules,
    ...gradeAppropriatenessRules(input.grade),
    outputBlock([
      "Format wajib (semua field diperlukan):",
      "  { \"_tag\": \"mcq_single\", \"number\": 1, \"text\": \"...\", \"option_a\": \"...\", \"option_b\": \"...\", \"option_c\": \"...\", \"option_d\": \"...\", \"correct_answer\": \"a|b|c|d\", \"topic\": \"...\", \"difficulty\": \"mudah|sedang|sulit\" }",
      "",
      "Contoh minimal mcq_single (format benar):",
      `  ${MCQ_SINGLE_EXAMPLE}`
    ]),
    verificationBlock([
      "Pastikan array berisi tepat 1 elemen dengan \"_tag\": \"mcq_single\".",
      "Pastikan stem berbeda dari hindari_soal_mirip.",
      "Periksa escape backslash LaTeX ganda jika Matematika."
    ]),
    stopRulesBlock([
      "Setelah array JSON valid, jangan tulis apa pun lagi.",
      "Jangan minta klarifikasi; gunakan parameter user."
    ])
  ])

  const userPayload: Record<string, unknown> = {
    kelas: input.grade,
    mata_pelajaran: input.subjectLabel,
    topik: input.topic,
    kesulitan: input.difficulty,
    hindari_soal_mirip: input.siblingTexts.slice(0, 10).map((t) => t.substring(0, 80))
  }
  if (input.hint !== undefined && input.hint.trim() !== "") {
    userPayload["petunjuk_guru"] = input.hint.trim()
  }

  const user = JSON.stringify(userPayload, null, 2)

  return { system, user }
}
