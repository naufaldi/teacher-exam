import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ExamWithQuestions } from '@teacher-exam/shared'

const { mockRouteState } = vi.hoisted(() => ({
  mockRouteState: {
    loaderData: null as ExamWithQuestions | null,
    params: { examId: 'exam-real' },
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute:
      () =>
      (opts: Record<string, unknown>) => ({
        options: opts,
        useLoaderData: () => mockRouteState.loaderData,
        useParams: () => mockRouteState.params,
      }),
    Link: ({
      children,
      to,
      className,
    }: {
      children: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  }
})

vi.mock('../../lib/api.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../lib/api.js')>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: { ...orig.api.exams, get: vi.fn() },
    },
  }
})

import { Route } from '../_auth.correction.$examId.js'

const NOW = '2026-04-25T00:00:00.000Z'
const ANSWERS = ['a', 'b', 'c', 'd'] as const

function makeExam(): ExamWithQuestions {
  return {
    id: 'exam-real',
    userId: 'user-1',
    title: 'Ulangan Harian Bahasa Indonesia',
    subject: 'bahasa_indonesia',
    grade: 5,
    difficulty: 'campuran',
    topic: 'Pemahaman Bacaan',
    reviewMode: 'fast',
    status: 'final',
    schoolName: 'SD Codex',
    academicYear: '2025/2026',
    examType: 'formatif',
    examDate: '2026-04-25',
    durationMinutes: 60,
    instructions: 'Pilih jawaban yang benar.',
    classContext: null,
    discussionMd: null,
    createdAt: NOW,
    updatedAt: NOW,
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: `q-${i + 1}`,
      examId: 'exam-real',
      number: i + 1,
      text: `Soal ${i + 1}`,
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: ANSWERS[(i % ANSWERS.length) as 0 | 1 | 2 | 3],
      topic: 'Pemahaman Bacaan',
      difficulty: 'sedang',
      status: 'accepted',
      validationStatus: null,
      validationReason: null,
      createdAt: NOW,
    })),
  }
}

function renderCorrectionPage() {
  const CorrectionPage = Route.options.component as React.ComponentType
  return render(<CorrectionPage />)
}

describe('CorrectionPage', () => {
  it('renders the real exam answer key from loader data', () => {
    mockRouteState.loaderData = makeExam()

    renderCorrectionPage()

    expect(screen.queryByText(/Memuat kunci jawaban/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Koreksi Cepat/i })).toBeInTheDocument()
    expect(screen.getByText(/Ulangan Harian Bahasa Indonesia .* 20 soal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Jawaban A untuk soal 1$/i })).toBeInTheDocument()
  })
})
