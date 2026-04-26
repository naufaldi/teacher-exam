import { Match } from 'effect'
import type { BuiltPrompt } from './prompt'

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
  _tag: 'mcq_single'
  number: number
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: 'a' | 'b' | 'c' | 'd'
  topic: string | null
  difficulty: string | null
}

export interface PembahasanMcqMultiQuestion {
  _tag: 'mcq_multi'
  number: number
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: ReadonlyArray<'a' | 'b' | 'c' | 'd'>
  topic: string | null
  difficulty: string | null
}

export interface PembahasanTrueFalseQuestion {
  _tag: 'true_false'
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

function isTypedQuestion(q: PembahasanQuestion): q is Exclude<PembahasanQuestion, PembahasanLegacyQuestion> {
  return '_tag' in q
}

function serializeQuestion(q: PembahasanQuestion) {
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
      difficulty: q.difficulty,
    }
  }

  const common = {
    number: q.number,
    type: q._tag,
    text: q.text,
    topic: q.topic ?? '',
    difficulty: q.difficulty ?? '',
  }

  return Match.value(q).pipe(
    Match.tag('mcq_single', (x) => ({
      ...common,
      options: x.options,
      correct: x.correct,
    })),
    Match.tag('mcq_multi', (x) => ({
      ...common,
      options: x.options,
      correct: x.correct,
    })),
    Match.tag('true_false', (x) => ({
      ...common,
      statements: x.statements.map((s) => s.text),
      answers: x.statements.map((s) => (s.answer ? 'B' : 'S')),
    })),
    Match.exhaustive,
  )
}

export function buildPembahasanPrompt(input: BuildPembahasanInput): BuiltPrompt {
  if (input.questions.length === 0) {
    throw new Error('buildPembahasanPrompt: questions must not be empty')
  }

  const system = [
    `Kamu adalah kakak yang sabar membantu adik kelas ${input.exam.grade} SD memahami soal ${input.exam.subject} (${input.exam.examType.toUpperCase()}).`,
    '',
    'Tugas: untuk SETIAP soal pada daftar JSON di bawah, tulis pembahasan dalam format markdown:',
    '',
    '## {nomor}. {ringkas isi soal dalam 1 kalimat pendek}',
    '**Jawaban Benar: {label jawaban}**',
    '',
    '{2 sampai 3 kalimat pendek menjelaskan MENGAPA jawaban itu benar.}',
    '',
    '**Tip:** {1 kalimat singkat agar mudah diingat}',
    '',
    '---',
    '',
    'Format label jawaban berdasarkan jenis soal:',
    '- Pilihan ganda biasa (mcq_single): satu huruf, contoh A.',
    '- Pilihan ganda kompleks (mcq_multi): beberapa huruf dipisah koma, contoh A, C.',
    '- Benar/Salah (true_false): urutan B/S sesuai baris pernyataan, contoh B, S, B.',
    '- Jangan mencari opsi A-D pada soal Benar/Salah. Gunakan statements dan answers.',
    '',
    'Aturan bahasa (WAJIB):',
    `- Tulis untuk anak kelas ${input.exam.grade} SD. Bayangkan kamu menjelaskan ke adikmu sendiri.`,
    '- Setiap kalimat maksimal 12 kata.',
    '- Pakai kata sehari-hari. Hindari istilah teknis. Kalau terpaksa pakai, jelaskan dalam tanda kurung.',
    '- JANGAN gunakan kata-kata ini (terlalu sulit untuk SD): implisit, eksplisit, rincian, mendalam, konsep, konkret, abstrak, analisis, komprehensif.',
    '- Ganti dengan kata sederhana: tersembunyi (bukan implisit), jelas/terang-terangan (bukan eksplisit), isi/bagian (bukan rincian), dalam-dalam (bukan mendalam).',
    '- Boleh memakai contoh sederhana dari kehidupan sehari-hari (uang jajan, mainan, makanan, sekolah).',
    '- Tidak boleh menyalin soal kata per kata. Ringkas dengan kalimatmu sendiri.',
    '- Tidak boleh ada paragraf pembuka atau penutup di luar blok per-soal.',
    '- Jawaban Benar wajib mengikuti format label jawaban sesuai jenis soal.',
    '- Ikuti urutan nomor soal dari kecil ke besar. Jangan lewati nomor.',
  ].join('\n')

  const user = JSON.stringify(
    input.questions.map((q) => serializeQuestion(q)),
  )

  return { system, user }
}
