import { Match } from 'effect'
import type { Question } from '@teacher-exam/shared'
import type { BuiltPrompt } from './prompt'
import {
  serializeQuestionForPrompt,
  type PembahasanMcqMultiQuestion,
  type PembahasanMcqSingleQuestion,
  type PembahasanQuestion,
  type PembahasanTrueFalseQuestion,
} from './pembahasan-prompt'

export type { BuiltPrompt }

export interface BuildValidatorInput {
  exam: {
    subject: string
    grade: number
    examType: string
  }
  curriculumText: string
  questions: ReadonlyArray<Question>
}

function questionToPembahasanShape(q: Question): PembahasanQuestion {
  return Match.value(q).pipe(
    Match.tag('mcq_single', (x): PembahasanMcqSingleQuestion => ({
      _tag: 'mcq_single',
      number: x.number,
      text: x.text,
      options: x.options,
      correct: x.correct,
      topic: x.topic,
      difficulty: x.difficulty,
    })),
    Match.tag('mcq_multi', (x): PembahasanMcqMultiQuestion => ({
      _tag: 'mcq_multi',
      number: x.number,
      text: x.text,
      options: x.options,
      correct: x.correct,
      topic: x.topic,
      difficulty: x.difficulty,
    })),
    Match.tag('true_false', (x): PembahasanTrueFalseQuestion => ({
      _tag: 'true_false',
      number: x.number,
      text: x.text,
      statements: x.statements,
      topic: x.topic,
      difficulty: x.difficulty,
    })),
    Match.exhaustive,
  )
}

export function buildValidatorPrompt(input: BuildValidatorInput): BuiltPrompt {
  if (input.questions.length === 0) {
    throw new Error('buildValidatorPrompt: questions must not be empty')
  }

  const system = [
    `Kamu adalah Penjaga Kurikulum untuk soal ulangan SD Kurikulum Merdeka Fase C (Kelas 5–6).`,
    `Mata pelajaran: ${input.exam.subject}, kelas ${input.exam.grade}, jenis ujian: ${input.exam.examType}.`,
    '',
    'Tugas: evaluasi SETIAP soal pada daftar JSON user terhadap CP/TP pada korpus di bawah.',
    '',
    'Status yang diizinkan (field "status"):',
    '- "valid" — soal sesuai CP/TP dan level kognitif untuk kelas ini',
    '- "needs_review" — ketidaksesuaian minor (mis. level kognitif sedikit tinggi/rendah)',
    '- "invalid" — soal keluar topik atau tidak selaras CP',
    '',
    'Field "reason": 1–2 kalimat singkat dalam Bahasa Indonesia.',
    '',
    'Output rules:',
    '- Jawab HANYA dengan JSON array — tanpa prosa, tanpa markdown fence.',
    `- Satu objek per soal: { "number": <int>, "status": "valid"|"needs_review"|"invalid", "reason": "..." }`,
    `- Wajib ada entri untuk setiap nomor soal pada input (${input.questions.length} soal).`,
    '',
    '--- KORPUS BUKU SISWA (Kurikulum Merdeka, Fase C) ---',
    input.curriculumText,
    '--- AKHIR KORPUS ---',
  ].join('\n')

  const user = JSON.stringify(
    input.questions.map((q) => serializeQuestionForPrompt(questionToPembahasanShape(q))),
  )

  return { system, user }
}
