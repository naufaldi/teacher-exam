import type { ExamDifficulty, ExamType } from '@teacher-exam/shared'
import type { Composition } from './exam-type-profile'
import { EXAM_TYPE_PROFILE, resolveDifficultyDist } from './exam-type-profile'

export interface BuildPromptInput {
  examType: ExamType
  difficulty: ExamDifficulty
  subjectLabel: string
  grade: number
  /** One or more topics for the paper. AI distributes questions evenly across them when multiple are given. */
  topics: string[]
  totalSoal: number
  /** Full markdown curriculum corpus sent as the system-message baseline. */
  curriculumText: string
  classContext?: string | undefined
  exampleQuestions?: string | undefined
  composition?: Composition | undefined
}

export interface BuiltPrompt {
  /** Sent as the Anthropic `system` field — baseline grounding + output rules. */
  system: string
  /** Sent as the user message text block — task-specific parameters. */
  user: string
}

export function buildExamPrompt(input: BuildPromptInput): BuiltPrompt {
  const profile = EXAM_TYPE_PROFILE[input.examType]
  if (input.topics.length === 0) {
    throw new Error('buildExamPrompt: topics must contain at least one item')
  }
  const dist = resolveDifficultyDist(input.examType, input.difficulty, input.totalSoal)

  const system = [
    profile.promptPreamble,
    'Anda adalah generator soal ulangan SD untuk Kurikulum Merdeka Fase C (Kelas 5–6).',
    '',
    'Authority order:',
    '  1. Korpus Buku Siswa di bawah = baseline kurikulum (otoritatif untuk CP, daftar bab, sub-konsep, sample teks bacaan, dan kosakata).',
    '  2. PDF guru (jika ada di user message sebagai document block) = konteks tambahan untuk memperkaya soal — bukan pengganti korpus.',
    '',
    '--- KORPUS BUKU SISWA (Kurikulum Merdeka, Fase C) ---',
    input.curriculumText,
    '--- AKHIR KORPUS ---',
    '',
    'Output rules:',
    `- Jawab HANYA dengan JSON array berisi tepat ${input.totalSoal} soal — tanpa prosa, tanpa pembungkus markdown.`,
    `- Setiap soal WAJIB memiliki field "_tag" yang menentukan jenisnya. Tiga jenis yang diizinkan:`,
    `- Setiap soal WAJIB memiliki field "number" berurutan dari 1 sampai ${input.totalSoal}.`,
    ``,
    `  1. Pilihan Ganda (mcq_single):`,
    `     { "_tag": "mcq_single", "number": 1, "text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "a|b|c|d", "topic": "...", "difficulty": "mudah|sedang|sulit", "cognitive_level": "C1|C2|C3|C4" }`,
    ``,
    `  2. Pilihan Ganda Kompleks (mcq_multi) — pilih 2–3 jawaban benar:`,
    `     { "_tag": "mcq_multi", "number": 2, "text": "...(awali dengan 'Pilih dua/tiga jawaban yang benar!')", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answers": ["a", "c"], "topic": "...", "difficulty": "mudah|sedang|sulit", "cognitive_level": "C1|C2|C3|C4" }`,
    `     Catatan: correct_answers adalah array 2–3 huruf unik (a/b/c/d).`,
    ``,
    `  3. Benar/Salah (true_false) — tabel pernyataan:`,
    `     { "_tag": "true_false", "number": 3, "text": "Tentukan apakah pernyataan berikut benar (B) atau salah (S):", "statements": [{ "text": "...", "answer": "B" }, { "text": "...", "answer": "S" }], "topic": "...", "difficulty": "mudah|sedang|sulit", "cognitive_level": "C1|C2|C3|C4" }`,
    `     Catatan: statements berisi 3–4 pernyataan; answer adalah "B" atau "S".`,
    ``,
    `- Hormati distribusi kesulitan target dan level kognitif yang diizinkan untuk jenis lembar ini.`,
    `- Gaya soal: ${profile.stemHint}`,
  ].join('\n')

  const topicsLabel =
    input.topics.length === 1
      ? (input.topics[0] ?? '')
      : input.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const topicsInstruction =
    input.topics.length > 1
      ? `Distribusikan soal secara merata di antara semua topik (sekitar ${Math.round(input.totalSoal / input.topics.length)} soal per topik). Setiap soal harus mencantumkan nama topiknya di field "topic".`
      : 'Topik bersifat directive (fokus utama), bukan filter — Anda boleh mengambil konteks dari bab manapun di korpus selama relevan dengan topik.'

  const comp = input.composition ?? { mcqSingle: input.totalSoal, mcqMulti: 0, trueFalse: 0 }
  const typeParts: string[] = []
  if (comp.mcqSingle > 0) typeParts.push(`${comp.mcqSingle} soal pilihan ganda`)
  if (comp.mcqMulti > 0) typeParts.push(`${comp.mcqMulti} soal pilihan ganda kompleks`)
  if (comp.trueFalse > 0) typeParts.push(`${comp.trueFalse} soal benar/salah`)
  const compositionSentence = `Buatkan satu lembar berisi ${typeParts.join(', ')} (total ${input.totalSoal} soal) berdasarkan parameter berikut.`

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
      true_false: comp.trueFalse,
    },
  }
  if (input.classContext && input.classContext.trim() !== '') {
    params['konteks_guru'] = input.classContext.trim()
  }
  if (input.exampleQuestions && input.exampleQuestions.trim() !== '') {
    params['contoh_soal'] = input.exampleQuestions.trim()
  }

  const user = [
    compositionSentence,
    topicsInstruction,
    'Jika ada PDF materi guru terlampir di pesan ini, gunakan sebagai sumber tambahan untuk konteks lokal/terkini.',
    '',
    JSON.stringify(params, null, 2),
  ].join('\n')

  return { system, user }
}
