import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { ExamWithQuestions, Question } from '@teacher-exam/shared'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
}))

// Mutable so individual tests can override loader data (e.g. topics array)
let mockLoaderData: ExamWithQuestions | undefined = undefined

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useLoaderData: () => mockLoaderData,
    }),
    redirect: ({ to }: { to: string }) =>
      Object.assign(new Error(`Redirect to ${to}`), { isRedirect: true, to }),
    useNavigate: () => mockNavigate,
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

import { examDraftStore } from '../../lib/exam-draft-store.js'
import { Route } from '../_auth.preview.js'

type RouteOptions = {
  component: ComponentType
}

const NOW = '2026-04-23T00:00:00.000Z'

function makeExamWithQuestions(topics: string[]): ExamWithQuestions {
  return {
    id: 'exam-preview',
    userId: 'user-1',
    title: 'Test Exam',
    subject: 'bahasa_indonesia',
    grade: 6,
    difficulty: 'sedang',
    topics,
    reviewMode: 'fast',
    status: 'draft',
    schoolName: 'SD Nusantara',
    academicYear: '2025/2026',
    examType: 'formatif',
    examDate: '23 April 2026',
    durationMinutes: 60,
    instructions: 'Pilih jawaban yang benar.',
    classContext: null,
    discussionMd: null,
    createdAt: NOW,
    updatedAt: NOW,
    questions: [makeQuestion(1), makeQuestion(2)],
  }
}

function makeQuestion(number: number): Question {
  return {
    id: `q-${number}`,
    examId: 'exam-preview',
    number,
    text: `Soal nomor ${number}`,
    optionA: 'Pilihan A',
    optionB: 'Pilihan B',
    optionC: 'Pilihan C',
    optionD: 'Pilihan D',
    correctAnswer: 'a',
    topic: 'Teks Narasi',
    difficulty: 'sedang',
    status: 'accepted',
    validationStatus: null,
    validationReason: null,
    createdAt: NOW,
  }
}

function seedPreviewDraft() {
  examDraftStore.setQuestions([makeQuestion(1), makeQuestion(2)])
  examDraftStore.setReviewMode('fast')
  examDraftStore.setConfig({
    subject: 'bahasa_indonesia',
    grade: 6,
    topic: 'Teks Narasi',
    examType: 'formatif',
  })
  examDraftStore.setMetadata({
    schoolName: 'SD Nusantara',
    academicYear: '2025/2026',
    examDate: '23 April 2026',
    durationMinutes: 60,
    instructions: 'Pilih jawaban yang benar.',
  })
}

function renderPreviewPage() {
  const PreviewPage = (Route as unknown as { options: RouteOptions }).options.component
  return render(<PreviewPage />)
}

function closestByAttr(node: HTMLElement, attr: string): HTMLElement | null {
  return node.closest(`[${attr}]`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  mockLoaderData = undefined
  examDraftStore.reset()
  seedPreviewDraft()
  delete document.body.dataset['printScope']
})

afterEach(() => {
  delete document.body.dataset['printScope']
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('variable points per question', () => {
  function seedDraftWithQuestions(count: number) {
    const questions = Array.from({ length: count }, (_, i) => makeQuestion(i + 1))
    examDraftStore.setQuestions(questions)
    examDraftStore.setReviewMode('fast')
    examDraftStore.setConfig({
      subject: 'bahasa_indonesia',
      grade: 6,
      topic: 'Teks Narasi',
      examType: 'formatif',
    })
    examDraftStore.setMetadata({
      schoolName: 'SD Nusantara',
      academicYear: '2025/2026',
      examDate: '23 April 2026',
      durationMinutes: 60,
      instructions: 'Pilih jawaban yang benar.',
    })
  }

  it('25 soal → 4 poin per soal, 100 total poin', () => {
    seedDraftWithQuestions(25)
    renderPreviewPage()
    expect(screen.getByText('4 poin')).toBeInTheDocument()
    expect(screen.getByText('Total: 100 poin')).toBeInTheDocument()
  })

  it('10 soal → 10 poin per soal, 100 total poin', () => {
    seedDraftWithQuestions(10)
    renderPreviewPage()
    expect(screen.getByText('10 poin')).toBeInTheDocument()
    expect(screen.getByText('Total: 100 poin')).toBeInTheDocument()
  })
})

describe('PreviewPage print flow', () => {
  it('keeps print scope active until afterprint fires', () => {
    vi.useFakeTimers()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    renderPreviewPage()
    fireEvent.click(screen.getByRole('button', { name: /cetak soal/i }))

    expect(document.body.dataset['printScope']).toBe('soal')

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.dataset['printScope']).toBe('soal')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(document.body.dataset['printScope']).toBe('soal')

    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })

    expect(document.body.dataset['printScope']).toBeUndefined()
  })

  it('keeps preview screen wording and toolbar outside printable content', () => {
    renderPreviewPage()

    const printable = document.querySelector('[data-print-content]')
    expect(printable).toBeInstanceOf(HTMLElement)
    expect(within(printable as HTMLElement).queryByText('Preview Lembar')).not.toBeInTheDocument()
    expect(within(printable as HTMLElement).queryByRole('button', { name: /cetak semua/i })).not.toBeInTheDocument()

    const previewTitle = screen.getByRole('heading', { name: 'Preview Lembar' })
    const previewHeader = closestByAttr(previewTitle, 'data-screen-only')
    expect(previewHeader).toHaveAttribute('data-no-print')

    const printAllButton = screen.getByRole('button', { name: /cetak semua/i })
    const toolbar = closestByAttr(printAllButton, 'data-screen-only')
    expect(toolbar).toHaveAttribute('data-no-print')
  })

  it('keeps print section scope rules colocated with the preview route', () => {
    const { container } = renderPreviewPage()
    const styleText = Array.from(container.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('\n')

    expect(styleText).toContain('body[data-print-scope="soal"] [data-print-section="lj"]')
    expect(styleText).toContain('body[data-print-scope="lj"] [data-print-section="kunci"]')
    expect(styleText).toContain('body[data-print-scope="kunci"] [data-print-section="soal"]')
  })
})

describe('PreviewPage topics display', () => {
  it('shows multiple topics joined with middle dot in the paper header', () => {
    mockLoaderData = makeExamWithQuestions(['Matematika', 'IPA'])
    renderPreviewPage()

    // The joined topics label should appear somewhere in the printed content
    expect(screen.getAllByText('Matematika · IPA').length).toBeGreaterThan(0)
  })

  it('shows a single topic without a separator', () => {
    mockLoaderData = makeExamWithQuestions(['Teks Narasi'])
    renderPreviewPage()

    expect(screen.getAllByText('Teks Narasi').length).toBeGreaterThan(0)
  })
})
