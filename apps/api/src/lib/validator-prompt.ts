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
import {
  completenessBlock,
  corpusBlock,
  goalBlock,
  groundingBlock,
  joinPromptSections,
  outputBlock,
  roleBlock,
  stopRulesBlock,
  structuredJsonOutputBlock,
  successCriteriaBlock,
  verificationBlock,
} from './prompt-blocks.js'

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

  const questionCount = input.questions.length

  const system = joinPromptSections([
    roleBlock(
      `Kamu adalah Penjaga Kurikulum untuk soal ulangan SD Kurikulum Merdeka Fase C (Kelas 5–6). Mata pelajaran: ${input.exam.subject}, kelas ${input.exam.grade}, jenis ujian: ${input.exam.examType}.`,
    ),
    goalBlock('Evaluasi SETIAP soal pada daftar JSON user terhadap CP/TP pada korpus di bawah.'),
    successCriteriaBlock([
      `Satu objek JSON per soal input (${questionCount} entri).`,
      'Field "status" hanya valid | needs_review | invalid.',
      'Field "reason": 1–2 kalimat singkat Bahasa Indonesia.',
    ]),
    structuredJsonOutputBlock(),
    groundingBlock(),
    corpusBlock(input.curriculumText),
    completenessBlock(questionCount, 'soal'),
    outputBlock([
      'Status yang diizinkan (field "status"):',
      '- "valid" — soal sesuai CP/TP dan level kognitif untuk kelas ini',
      '- "needs_review" — ketidaksesuaian minor (mis. level kognitif sedikit tinggi/rendah)',
      '- "invalid" — soal keluar topik atau tidak selaras CP',
      '',
      'Bentuk setiap objek:',
      '  { "number": <int>, "status": "valid"|"needs_review"|"invalid", "reason": "..." }',
    ]),
    verificationBlock([
      'Pastikan jumlah entri sama dengan jumlah soal input.',
      'Pastikan setiap nomor input muncul tepat sekali.',
      'Pastikan status hanya nilai enum yang diizinkan.',
    ]),
    stopRulesBlock([
      'Setelah array JSON valid, jangan tulis apa pun lagi.',
      'Jangan minta klarifikasi; evaluasi dari korpus dan soal yang diberikan.',
    ]),
  ])

  const user = JSON.stringify(
    input.questions.map((q) => serializeQuestionForPrompt(questionToPembahasanShape(q))),
  )

  return { system, user }
}
