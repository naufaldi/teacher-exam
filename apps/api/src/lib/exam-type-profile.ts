import type {
  CognitiveLevel,
  ExamDifficulty,
  ExamType,
} from '@teacher-exam/shared'

/**
 * Per-exam-type steering profile injected into the AI prompt so generated
 * sheets are consistent and auditable. See PRD §8.6 and RFC §9.
 *
 * Tuning: changes here affect every generation. Keep distributions summing to
 * 20 (matches the fixed lembar size from PRD US-8).
 */
export interface ExamTypeProfile {
  /** Default distribution across difficulty buckets. Sum must equal 20. */
  difficultyDist: { mudah: number; sedang: number; sulit: number }
  /** Bloom levels the model is allowed to emit for this jenis. */
  cognitiveLevels: ReadonlyArray<CognitiveLevel>
  /** One-line stem/style hint appended to the prompt. */
  stemHint: string
  /** 1-2 sentence framing that opens the prompt. */
  promptPreamble: string
  /** Uppercase label printed on the exam sheet header (kop). */
  kopLabel: string
}

export const EXAM_TYPE_PROFILE: Record<ExamType, ExamTypeProfile> = {
  latihan: {
    difficultyDist: { mudah: 8, sedang: 8, sulit: 4 },
    cognitiveLevels: ['C1', 'C2', 'C3'],
    stemHint:
      'Gunakan konteks kehidupan sehari-hari siswa SD; soal eksploratif dan ramah.',
    promptPreamble:
      'Lembar ini untuk LATIHAN mandiri. Tone ramah, fokus membangun pemahaman dasar dan aplikasi sederhana.',
    kopLabel: 'LATIHAN SOAL',
  },
  formatif: {
    difficultyDist: { mudah: 6, sedang: 10, sulit: 4 },
    cognitiveLevels: ['C1', 'C2', 'C3'],
    stemHint:
      'Soal berfokus pada satu topik; tonjolkan miskonsepsi umum siswa sebagai distractor.',
    promptPreamble:
      'Lembar ini untuk ULANGAN HARIAN (Asesmen Formatif). Ukur penguasaan satu topik dengan soal terukur dan distractor edukatif.',
    kopLabel: 'ULANGAN HARIAN',
  },
  sts: {
    difficultyDist: { mudah: 6, sedang: 10, sulit: 4 },
    cognitiveLevels: ['C1', 'C2', 'C3'],
    stemHint:
      'Cakup variasi sub-topik dalam bab; sebagian soal berbasis stimulus singkat (1-2 kalimat).',
    promptPreamble:
      'Lembar ini untuk UTS / Sumatif Tengah Semester. Cakupan lebih luas dari ulangan harian, distribusi kesulitan terukur.',
    kopLabel: 'PENILAIAN TENGAH SEMESTER',
  },
  sas: {
    difficultyDist: { mudah: 4, sedang: 10, sulit: 6 },
    cognitiveLevels: ['C2', 'C3', 'C4'],
    stemHint:
      'Cakup seluruh topik semester; tambahkan beberapa soal dengan stimulus paragraf pendek (3-4 kalimat) untuk analisis.',
    promptPreamble:
      'Lembar ini untuk UAS / Sumatif Akhir Semester. Cakupan satu semester penuh; sertakan elemen analisis dan evaluasi.',
    kopLabel: 'PENILAIAN AKHIR SEMESTER',
  },
  tka: {
    difficultyDist: { mudah: 3, sedang: 9, sulit: 8 },
    cognitiveLevels: ['C2', 'C3', 'C4'],
    stemHint:
      'Soal kontekstual / HOTS dengan stimulus berupa paragraf 3-5 kalimat, infografik sederhana, atau dialog. Distractor menggoda.',
    promptPreamble:
      'Lembar ini untuk TKA (Tes Kemampuan Akademik). Format formal, soal HOTS, banyak konteks dan analisis.',
    kopLabel: 'TKA',
  },
}

/**
 * Resolve the effective difficulty distribution. If the teacher explicitly
 * picks a single bucket (mudah/sedang/sulit), bias the full sheet to that
 * bucket — overriding the profile default. `'campuran'` (default) yields the
 * profile's natural distribution.
 */
export function resolveDifficultyDist(
  examType: ExamType,
  difficulty: ExamDifficulty,
): { mudah: number; sedang: number; sulit: number } {
  const profile = EXAM_TYPE_PROFILE[examType]
  if (difficulty === 'campuran') return profile.difficultyDist
  // Heavy bias to the chosen bucket but keep small variation so the sheet
  // doesn't feel monotone (16/3/1 instead of 20/0/0).
  switch (difficulty) {
    case 'mudah':
      return { mudah: 16, sedang: 3, sulit: 1 }
    case 'sedang':
      return { mudah: 3, sedang: 14, sulit: 3 }
    case 'sulit':
      return { mudah: 1, sedang: 3, sulit: 16 }
  }
}

export interface BuildPromptInput {
  examType: ExamType
  difficulty: ExamDifficulty
  subjectLabel: string
  grade: number
  topic: string
  curriculumText: string
  classContext?: string | undefined
  exampleQuestions?: string | undefined
  extractedPdfText?: string | undefined
}

/**
 * Assemble the system prompt sent to Claude. Mirrors the template in RFC §9.
 * Pure function — no IO. Consumed by the (future) exam generation service.
 */
export function buildExamPrompt(input: BuildPromptInput): string {
  const profile = EXAM_TYPE_PROFILE[input.examType]
  const dist = resolveDifficultyDist(input.examType, input.difficulty)

  const sections: string[] = [
    profile.promptPreamble,
    `Mata Pelajaran: ${input.subjectLabel}. Kelas: ${input.grade} SD. Topik: ${input.topic}.`,
    'Kurikulum: Merdeka Fase C.',
    '',
    `Distribusi kesulitan target (dari 20 soal): mudah ${dist.mudah}, sedang ${dist.sedang}, sulit ${dist.sulit}.`,
    `Level kognitif yang diizinkan (Bloom): ${profile.cognitiveLevels.join(', ')}.`,
    `Gaya soal: ${profile.stemHint}`,
    '',
    input.curriculumText,
  ]

  if (input.classContext && input.classContext.trim() !== '') {
    sections.push('', `Konteks/Fokus guru: ${input.classContext.trim()}`)
  }
  if (input.exampleQuestions && input.exampleQuestions.trim() !== '') {
    sections.push(
      '',
      `Contoh gaya soal yang diinginkan:\n${input.exampleQuestions.trim()}`,
    )
  }
  if (input.extractedPdfText && input.extractedPdfText.trim() !== '') {
    sections.push('', `Materi pendukung dari PDF:\n${input.extractedPdfText.trim()}`)
  }

  sections.push(
    '',
    'Jawab dalam format JSON array berisi tepat 20 soal. Setiap soal punya field:',
    'text, option_a, option_b, option_c, option_d, correct_answer (a|b|c|d), topic, difficulty (mudah|sedang|sulit), cognitive_level (C1|C2|C3|C4).',
  )

  return sections.join('\n')
}
