import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { McqSingleQuestion, McqMultiQuestion, TrueFalseQuestion, ExamWithQuestions, Question } from '@teacher-exam/shared'

const { mockNavigate, mockGenerateDiscussion } = vi.hoisted(() => ({
  mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
  mockGenerateDiscussion: vi.fn(),
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
      exams: {
        ...orig.api.exams,
        get: vi.fn(),
        generateDiscussion: mockGenerateDiscussion,
      },
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
    questions: [makeMcqSingle(1), makeMcqSingle(2)],
  }
}

function makeMcqSingle(number: number, correct: 'a' | 'b' | 'c' | 'd' = 'a'): McqSingleQuestion {
  return {
    _tag: 'mcq_single',
    id: `q-${number}`,
    examId: 'exam-preview',
    number,
    text: `Soal nomor ${number}`,
    options: {
      a: 'Pilihan A',
      b: 'Pilihan B',
      c: 'Pilihan C',
      d: 'Pilihan D',
    },
    correct,
    topic: 'Teks Narasi',
    difficulty: 'sedang',
    status: 'accepted',
    validationStatus: null,
    validationReason: null,
    createdAt: NOW,
  }
}

function makeMcqMulti(number: number, correct: ('a' | 'b' | 'c' | 'd')[] = ['a', 'c']): McqMultiQuestion {
  return {
    _tag: 'mcq_multi',
    id: `q-${number}`,
    examId: 'exam-preview',
    number,
    text: `Soal nomor ${number} — Pilih dua/tiga jawaban yang benar`,
    options: {
      a: 'Pilihan A',
      b: 'Pilihan B',
      c: 'Pilihan C',
      d: 'Pilihan D',
    },
    correct,
    topic: 'Teks Narasi',
    difficulty: 'sedang',
    status: 'accepted',
    validationStatus: null,
    validationReason: null,
    createdAt: NOW,
  }
}

function makeTrueFalse(number: number, answers: boolean[] = [true, false, true]): TrueFalseQuestion {
  return {
    _tag: 'true_false',
    id: `q-${number}`,
    examId: 'exam-preview',
    number,
    text: `Soal nomor ${number}`,
    statements: answers.map((answer, i) => ({
      text: `Pernyataan ${i + 1}`,
      answer,
    })),
    topic: 'Teks Narasi',
    difficulty: 'sedang',
    status: 'accepted',
    validationStatus: null,
    validationReason: null,
    createdAt: NOW,
  }
}

function seedPreviewDraft(questions?: Question[]) {
  examDraftStore.setQuestions(questions ?? [makeMcqSingle(1), makeMcqSingle(2)])
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
    const questions = Array.from({ length: count }, (_, i) => makeMcqSingle(i + 1))
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

describe('Soal section renders correct structure per question type', () => {
  it('mcq_single: renders A/B/C/D option list without special hint text', () => {
    seedPreviewDraft([makeMcqSingle(1, 'b')])
    renderPreviewPage()

    // Should render options list
    const soalSection = document.querySelector('[data-print-section="soal"]')
    expect(soalSection).not.toBeNull()
    expect(within(soalSection as HTMLElement).getByText('a.')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('b.')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('c.')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('d.')).toBeInTheDocument()
    // No multi-select hint for single choice
    expect(within(soalSection as HTMLElement).queryByText(/pilih dua\/tiga/i)).not.toBeInTheDocument()
  })

  it('mcq_multi: renders A/B/C/D option list and shows hint text in question', () => {
    seedPreviewDraft([makeMcqMulti(1, ['a', 'c'])])
    renderPreviewPage()

    const soalSection = document.querySelector('[data-print-section="soal"]')
    expect(soalSection).not.toBeNull()
    // Hint embedded in the question text (factory sets it)
    expect(within(soalSection as HTMLElement).getByText(/pilih dua\/tiga jawaban yang benar/i)).toBeInTheDocument()
    // Options still rendered
    expect(within(soalSection as HTMLElement).getByText('a.')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('b.')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('c.')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('d.')).toBeInTheDocument()
  })

  it('true_false: renders a table with Pernyataan header and B/S columns, one row per statement', () => {
    seedPreviewDraft([makeTrueFalse(1, [true, false, true])])
    renderPreviewPage()

    const soalSection = document.querySelector('[data-print-section="soal"]')
    expect(soalSection).not.toBeNull()
    // Table headers
    expect(within(soalSection as HTMLElement).getByText('Pernyataan')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('B')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('S')).toBeInTheDocument()
    // Statement rows — 3 statements in fixture
    expect(within(soalSection as HTMLElement).getByText('Pernyataan 1')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('Pernyataan 2')).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText('Pernyataan 3')).toBeInTheDocument()
    // No A/B/C/D option letters for true_false
    expect(within(soalSection as HTMLElement).queryByText('a.')).not.toBeInTheDocument()
  })
})

describe('Kunci Jawaban uses correct labels per question type', () => {
  it('mcq_single with correct "b" → shows "B"', () => {
    seedPreviewDraft([makeMcqSingle(1, 'b')])
    renderPreviewPage()

    const kunciSection = document.querySelector('[data-print-section="kunci"]')
    expect(kunciSection).not.toBeNull()
    expect(within(kunciSection as HTMLElement).getByText('B')).toBeInTheDocument()
  })

  it('mcq_multi with correct ["a","c"] → shows "A, C"', () => {
    seedPreviewDraft([makeMcqMulti(1, ['a', 'c'])])
    renderPreviewPage()

    const kunciSection = document.querySelector('[data-print-section="kunci"]')
    expect(kunciSection).not.toBeNull()
    expect(within(kunciSection as HTMLElement).getByText('A, C')).toBeInTheDocument()
  })

  it('true_false with [true, false, true] → shows "B, S, B"', () => {
    seedPreviewDraft([makeTrueFalse(1, [true, false, true])])
    renderPreviewPage()

    const kunciSection = document.querySelector('[data-print-section="kunci"]')
    expect(kunciSection).not.toBeNull()
    expect(within(kunciSection as HTMLElement).getByText('B, S, B')).toBeInTheDocument()
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

describe('Pembahasan tab', () => {
  it('renders Pembahasan tab trigger in the tab list', () => {
    mockLoaderData = makeExamWithQuestions(['Teks Narasi'])
    renderPreviewPage()

    expect(screen.getByRole('tab', { name: /pembahasan/i })).toBeInTheDocument()
  })

  it('renders Generate Pembahasan CTA when discussionMd is null', () => {
    mockLoaderData = { ...makeExamWithQuestions(['Teks Narasi']), discussionMd: null }
    renderPreviewPage()

    const pembahasanSection = document.querySelector('[data-print-section="pembahasan"]')
    expect(pembahasanSection).not.toBeNull()
    expect(within(pembahasanSection as HTMLElement).getByRole('button', { name: /generate pembahasan/i })).toBeInTheDocument()
  })

  it('renders markdown read-only when discussionMd is non-null on load', () => {
    mockLoaderData = {
      ...makeExamWithQuestions(['Teks Narasi']),
      discussionMd: '## 1. Soal\n**Jawaban Benar: B**\n\nPenjelasan singkat.',
    }
    renderPreviewPage()

    const pembahasanSection = document.querySelector('[data-print-section="pembahasan"]')
    expect(pembahasanSection).not.toBeNull()
    expect(within(pembahasanSection as HTMLElement).getByText(/Jawaban Benar/)).toBeInTheDocument()
    expect(within(pembahasanSection as HTMLElement).queryByRole('button', { name: /generate pembahasan/i })).not.toBeInTheDocument()
  })

  it('clicking Generate calls api.exams.generateDiscussion and renders returned markdown', async () => {
    mockLoaderData = { ...makeExamWithQuestions(['Teks Narasi']), discussionMd: null }
    mockGenerateDiscussion.mockResolvedValueOnce({
      ...makeExamWithQuestions(['Teks Narasi']),
      discussionMd: '## 1. Hasil\n\n**Jawaban Benar: A**\n\nOke.',
    })

    renderPreviewPage()

    const pembahasanSection = document.querySelector('[data-print-section="pembahasan"]')
    const generateBtn = within(pembahasanSection as HTMLElement).getByRole('button', { name: /generate pembahasan/i })
    fireEvent.click(generateBtn)

    expect(mockGenerateDiscussion).toHaveBeenCalledWith('exam-preview')
    expect(await screen.findByText(/Jawaban Benar/)).toBeInTheDocument()
  })

  it('Cetak Pembahasan button calls triggerPrint with pembahasan scope', () => {
    vi.useFakeTimers()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    mockLoaderData = {
      ...makeExamWithQuestions(['Teks Narasi']),
      discussionMd: '## Pembahasan',
    }
    renderPreviewPage()

    fireEvent.click(screen.getByRole('button', { name: /cetak pembahasan/i }))

    expect(document.body.dataset['printScope']).toBe('pembahasan')
    act(() => { vi.advanceTimersByTime(50) })
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('CSS includes pembahasan print scope rules', () => {
    mockLoaderData = makeExamWithQuestions(['Teks Narasi'])
    const { container } = renderPreviewPage()
    const styleText = Array.from(container.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n')

    expect(styleText).toContain('body[data-print-scope="pembahasan"]')
  })
})
