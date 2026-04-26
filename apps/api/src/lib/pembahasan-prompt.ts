import type { BuiltPrompt } from './prompt'

export interface PembahasanQuestion {
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

export interface BuildPembahasanInput {
  exam: {
    subject: string
    grade: number
    examType: string
  }
  questions: ReadonlyArray<PembahasanQuestion>
}

export type { BuiltPrompt }

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
    '**Jawaban Benar: {A/B/C/D}**',
    '',
    '{2 sampai 3 kalimat pendek menjelaskan MENGAPA jawaban itu benar.}',
    '',
    '**Tip:** {1 kalimat singkat agar mudah diingat}',
    '',
    '---',
    '',
    'Aturan bahasa (WAJIB):',
    `- Tulis untuk anak kelas ${input.exam.grade} SD. Bayangkan kamu menjelaskan ke adikmu sendiri.`,
    '- Setiap kalimat maksimal 12 kata.',
    '- Pakai kata sehari-hari. Hindari istilah teknis. Kalau terpaksa pakai, jelaskan dalam tanda kurung.',
    '- Boleh memakai contoh sederhana dari kehidupan sehari-hari (uang jajan, mainan, makanan, sekolah).',
    '- Tidak boleh menyalin soal kata per kata. Ringkas dengan kalimatmu sendiri.',
    '- Tidak boleh ada paragraf pembuka atau penutup di luar blok per-soal.',
    '- Jawaban Benar wajib huruf kapital tunggal (A, B, C, atau D).',
    '- Ikuti urutan nomor soal dari kecil ke besar. Jangan lewati nomor.',
  ].join('\n')

  const user = JSON.stringify(
    input.questions.map((q) => ({
      number: q.number,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      difficulty: q.difficulty,
    })),
  )

  return { system, user }
}
