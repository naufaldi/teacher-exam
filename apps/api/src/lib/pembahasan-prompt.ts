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

export interface BuiltPrompt {
  system: string
  user: string
}

export function buildPembahasanPrompt(input: BuildPembahasanInput): BuiltPrompt {
  if (input.questions.length === 0) {
    throw new Error('buildPembahasanPrompt: questions must not be empty')
  }

  const system = [
    `Anda adalah asisten pendidikan yang membuat pembahasan soal ujian SD Kelas ${input.exam.grade} (${input.exam.subject}, ${input.exam.examType.toUpperCase()}).`,
    '',
    'Tugas: Untuk setiap soal dalam daftar, buat pembahasan singkat dalam format markdown berikut:',
    '',
    '## {nomor}. {ringkasan singkat teks soal}',
    '**Jawaban Benar: {huruf besar jawaban}**',
    '',
    '{penjelasan 2–4 kalimat mengapa jawaban tersebut benar, menggunakan bahasa yang mudah dipahami siswa SD}',
    '',
    '**Tip:** {1 kalimat kunci belajar atau konsep penting}',
    '',
    '---',
    '',
    'Aturan output:',
    '- Gunakan Bahasa Indonesia yang jelas dan sesuai level SD.',
    '- Setiap pembahasan WAJIB mencantumkan "Jawaban Benar" dengan huruf kapital (A/B/C/D).',
    '- Penjelasan fokus pada MENGAPA jawaban benar — bukan sekadar mengulang soal.',
    '- Tip berisi konsep kunci atau cara mengingat, bukan repetisi penjelasan.',
    '- Ikuti urutan nomor soal (1–20). Jangan lewati nomor manapun.',
    '- Jangan tambahkan prosa pembuka atau penutup di luar blok per-soal.',
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
    null,
    2,
  )

  return { system, user }
}
