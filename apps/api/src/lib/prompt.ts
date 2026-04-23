import type { ExamDifficulty, ExamType } from '@teacher-exam/shared'
import { EXAM_TYPE_PROFILE, resolveDifficultyDist } from './exam-type-profile'

export interface BuildPromptInput {
  examType: ExamType
  difficulty: ExamDifficulty
  subjectLabel: string
  grade: number
  topic: string
  /**
   * Full markdown corpus from `apps/api/src/curriculum/md/{subject}-kelas-{n}.md`
   * loaded via `getCurriculumText`. Becomes the baseline grounding in the
   * Claude system message — see RFC §9.
   */
  curriculumText: string
  classContext?: string | undefined
  exampleQuestions?: string | undefined
}

export interface BuiltPrompt {
  /** Sent as the Anthropic `system` field — baseline grounding + output rules. */
  system: string
  /** Sent as the user message text block — task-specific parameters. */
  user: string
}

/**
 * Assemble the two-part prompt for `/api/ai/generate`.
 *
 * - `system` carries the curriculum corpus, role, output rules, and the
 *   authority order (corpus = baseline, optional teacher PDF = additive).
 * - `user` carries only the per-request parameters (kelas, mapel, topik,
 *   jenis lembar, distribusi kesulitan, dst.) — the optional PDF is attached
 *   by the caller as a separate Claude `document` content block.
 *
 * Pure function — no IO. Mirrors RFC §9.
 */
export function buildExamPrompt(input: BuildPromptInput): BuiltPrompt {
  const profile = EXAM_TYPE_PROFILE[input.examType]
  const dist = resolveDifficultyDist(input.examType, input.difficulty)

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
    '- Jawab HANYA dengan JSON array berisi tepat 20 soal — tanpa prosa, tanpa pembungkus markdown.',
    '- Setiap soal punya field: text, option_a, option_b, option_c, option_d, correct_answer (a|b|c|d), topic, difficulty (mudah|sedang|sulit), cognitive_level (C1|C2|C3|C4).',
    `- Hormati distribusi kesulitan target dan level kognitif yang diizinkan untuk jenis lembar ini.`,
    `- Gaya soal: ${profile.stemHint}`,
  ].join('\n')

  const params: Record<string, unknown> = {
    kelas: input.grade,
    mata_pelajaran: input.subjectLabel,
    topik: input.topic,
    jenis_lembar: input.examType,
    distribusi_kesulitan: dist,
    level_kognitif: profile.cognitiveLevels,
  }
  if (input.classContext && input.classContext.trim() !== '') {
    params['konteks_guru'] = input.classContext.trim()
  }
  if (input.exampleQuestions && input.exampleQuestions.trim() !== '') {
    params['contoh_soal'] = input.exampleQuestions.trim()
  }

  const user = [
    'Buatkan satu lembar berisi 20 soal pilihan ganda berdasarkan parameter berikut.',
    'Topik bersifat directive (fokus utama), bukan filter — Anda boleh mengambil konteks dari bab manapun di korpus selama relevan dengan topik.',
    'Jika ada PDF materi guru terlampir di pesan ini, gunakan sebagai sumber tambahan untuk konteks lokal/terkini.',
    '',
    JSON.stringify(params, null, 2),
  ].join('\n')

  return { system, user }
}
