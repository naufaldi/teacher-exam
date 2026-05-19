import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { ExamWithQuestions, Question, ExamDetailResponse } from '@teacher-exam/shared'
import {
  makeExamWithQuestions,
  makeMcqSingle,
  makeMcqMulti,
  makeTrueFalse,
} from '../../../test/fixtures/exam.js'

const { mockNavigate, mockGenerateDiscussion, mockStreamDiscussion, previewTestCtx } = vi.hoisted(() => ({
  mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
  mockGenerateDiscussion: vi.fn(),
  mockStreamDiscussion: vi.fn(),
  previewTestCtx: { mockLoaderData: undefined as ExamWithQuestions | undefined },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useLoaderData: () => previewTestCtx.mockLoaderData,
    }),
    redirect: ({ to }: { to: string }) =>
      Object.assign(new Error(`Redirect to ${to}`), { isRedirect: true, to }),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../lib/api.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../lib/api.js')>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: {
        ...orig.api.exams,
        get: vi.fn(),
        generateDiscussion: mockGenerateDiscussion,
        streamDiscussion: mockStreamDiscussion,
      },
    },
  }
})

import { examDraftStore } from '../../../lib/exam-draft-store.js'
import { api } from '../../../lib/api.js'
import { Route } from '../../_auth.preview.js'

type RouteOptions = {
  component: ComponentType
  loader?: (ctx: { deps: { examId?: string } }) => Promise<unknown>
}

const mockExamsGet = (api as unknown as { exams: { get: ReturnType<typeof vi.fn> } }).exams.get

function getLoader() {
  return (Route as unknown as { options: RouteOptions }).options.loader!
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
  previewTestCtx.mockLoaderData = undefined
  examDraftStore.reset()
  seedPreviewDraft()
  delete document.body.dataset['printScope']
})

afterEach(() => {
  delete document.body.dataset['printScope']
  vi.useRealTimers()
  vi.restoreAllMocks()
})

export {
  act,
  fireEvent,
  screen,
  within,
  previewTestCtx,
  mockNavigate,
  mockExamsGet,
  mockGenerateDiscussion,
  mockStreamDiscussion,
  renderPreviewPage,
  getLoader,
  seedPreviewDraft,
  closestByAttr,
}
