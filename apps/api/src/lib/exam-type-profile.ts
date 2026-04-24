import type { CognitiveLevel, ExamDifficulty, ExamType } from '@teacher-exam/shared'

/**
 * Per-exam-type steering profile injected into the AI prompt so generated
 * sheets are consistent and auditable. See PRD §8.6 and RFC §9.
 *
 * Tuning: changes here affect every generation. The `difficultyDist` values
 * are a baseline distribution that sums to each type's `defaultTotalSoal`.
 * Use `rescaleDifficultyDist()` to scale to any other total.
 */

export interface Composition {
  mcqSingle: number
  mcqMulti: number
  trueFalse: number
}

export interface ExamTypeProfile {
  /** Baseline distribution across difficulty buckets; sums to defaultTotalSoal. Use rescaleDifficultyDist() to scale to other totals. */
  difficultyDist: { mudah: number; sedang: number; sulit: number }
  /** Default total number of questions for this exam type. */
  defaultTotalSoal: number
  /** Bloom levels the model is allowed to emit for this jenis. */
  cognitiveLevels: ReadonlyArray<CognitiveLevel>
  /** One-line stem/style hint appended to the prompt. */
  stemHint: string
  /** 1-2 sentence framing that opens the prompt. */
  promptPreamble: string
  /** Uppercase label printed on the exam sheet header (kop). */
  kopLabel: string
  /** Default question-type composition summing to defaultTotalSoal. Use resolveComposition() to scale to other totals. */
  composition: Composition
}

export const EXAM_TYPE_PROFILE: Record<ExamType, ExamTypeProfile> = {
  latihan: {
    difficultyDist: { mudah: 8, sedang: 8, sulit: 4 },
    defaultTotalSoal: 20,
    cognitiveLevels: ['C1', 'C2', 'C3'],
    stemHint:
      'Gunakan konteks kehidupan sehari-hari siswa SD; soal eksploratif dan ramah.',
    promptPreamble:
      'Lembar ini untuk LATIHAN mandiri. Tone ramah, fokus membangun pemahaman dasar dan aplikasi sederhana.',
    kopLabel: 'LATIHAN SOAL',
    composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  },
  formatif: {
    difficultyDist: { mudah: 6, sedang: 10, sulit: 4 },
    defaultTotalSoal: 20,
    cognitiveLevels: ['C1', 'C2', 'C3'],
    stemHint:
      'Soal berfokus pada satu topik; tonjolkan miskonsepsi umum siswa sebagai distractor.',
    promptPreamble:
      'Lembar ini untuk ULANGAN HARIAN (Asesmen Formatif). Ukur penguasaan satu topik dengan soal terukur dan distractor edukatif.',
    kopLabel: 'ULANGAN HARIAN',
    composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  },
  sts: {
    difficultyDist: { mudah: 8, sedang: 13, sulit: 4 },
    defaultTotalSoal: 25,
    cognitiveLevels: ['C1', 'C2', 'C3'],
    stemHint:
      'Cakup variasi sub-topik dalam bab; sebagian soal berbasis stimulus singkat (1-2 kalimat).',
    promptPreamble:
      'Lembar ini untuk UTS / Sumatif Tengah Semester. Cakupan lebih luas dari ulangan harian, distribusi kesulitan terukur.',
    kopLabel: 'PENILAIAN TENGAH SEMESTER',
    composition: { mcqSingle: 18, mcqMulti: 4, trueFalse: 3 },
  },
  sas: {
    difficultyDist: { mudah: 5, sedang: 13, sulit: 7 },
    defaultTotalSoal: 25,
    cognitiveLevels: ['C2', 'C3', 'C4'],
    stemHint:
      'Cakup seluruh topik semester; tambahkan beberapa soal dengan stimulus paragraf pendek (3-4 kalimat) untuk analisis.',
    promptPreamble:
      'Lembar ini untuk UAS / Sumatif Akhir Semester. Cakupan satu semester penuh; sertakan elemen analisis dan evaluasi.',
    kopLabel: 'PENILAIAN AKHIR SEMESTER',
    composition: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 },
  },
  tka: {
    difficultyDist: { mudah: 4, sedang: 11, sulit: 10 },
    defaultTotalSoal: 25,
    cognitiveLevels: ['C2', 'C3', 'C4'],
    stemHint:
      'Soal kontekstual / HOTS dengan stimulus berupa paragraf 3-5 kalimat, infografik sederhana, atau dialog. Distractor menggoda.',
    promptPreamble:
      'Lembar ini untuk TKA (Tes Kemampuan Akademik). Format formal, soal HOTS, banyak konteks dan analisis.',
    kopLabel: 'TKA',
    composition: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 },
  },
}

// TODO(phase2-task5): this returns the raw baseline difficultyDist (sum = defaultTotalSoal of each profile).
// When wiring totalSoal in routes/ai.ts, call rescaleDifficultyDist(examType, totalSoal) instead.
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

/**
 * Proportionally scale the baseline difficulty distribution of an exam type
 * to any total number of questions. The last bucket (sulit) absorbs rounding
 * remainder so the sum is always exactly `totalSoal`.
 */
export function rescaleDifficultyDist(
  examType: ExamType,
  totalSoal: number,
): { mudah: number; sedang: number; sulit: number } {
  const base = EXAM_TYPE_PROFILE[examType].difficultyDist
  const baseTotal = base.mudah + base.sedang + base.sulit
  const mudah = Math.round((base.mudah / baseTotal) * totalSoal)
  const sedang = Math.round((base.sedang / baseTotal) * totalSoal)
  const sulit = Math.max(0, totalSoal - mudah - sedang)
  return { mudah, sedang, sulit }
}

/**
 * Resolve the effective question-type composition for a given exam type and
 * total number of questions.
 *
 * When `override` is provided it is validated (sum must equal `totalSoal`) and
 * returned as-is, giving callers full control over the split.
 *
 * Without an override the profile's default composition is scaled
 * proportionally using the same rounding strategy as `rescaleDifficultyDist`:
 * `mcqSingle` and `mcqMulti` are rounded independently; `trueFalse` absorbs
 * the remainder so the sum is always exactly `totalSoal`.
 */
export function resolveComposition(
  examType: ExamType,
  totalSoal: number,
  override?: Composition,
): Composition {
  if (override !== undefined) {
    const sum = override.mcqSingle + override.mcqMulti + override.trueFalse
    if (sum !== totalSoal) {
      throw new Error(`Composition sum (${sum}) must equal totalSoal (${totalSoal})`)
    }
    return override
  }
  const base = EXAM_TYPE_PROFILE[examType].composition
  const baseTotal = base.mcqSingle + base.mcqMulti + base.trueFalse
  if (baseTotal === 0) return { mcqSingle: totalSoal, mcqMulti: 0, trueFalse: 0 }
  const mcqSingle = Math.round((base.mcqSingle / baseTotal) * totalSoal)
  const mcqMulti = Math.round((base.mcqMulti / baseTotal) * totalSoal)
  const trueFalse = Math.max(0, totalSoal - mcqSingle - mcqMulti)
  return { mcqSingle, mcqMulti, trueFalse }
}

