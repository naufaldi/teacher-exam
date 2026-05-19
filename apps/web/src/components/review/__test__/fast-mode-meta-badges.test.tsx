import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Question } from '@teacher-exam/shared'
import { TooltipProvider } from '@teacher-exam/ui'
import { FastModeAnswerKeyBadge } from '../fast-mode-answer-key-badge.js'
import { FastModeTopicBadge } from '../fast-mode-topic-badge.js'

const REVIEW_NOW = '2025-01-01T00:00:00.000Z'

const mcqMulti: Question = {
  _tag: 'mcq_multi',
  id: 'q-multi',
  examId: 'exam_1',
  number: 1,
  text: 'Multi question',
  options: { a: 'A', b: 'B', c: 'C', d: 'D' },
  correct: ['a', 'c'],
  topic: null,
  difficulty: null,
  status: 'pending',
  validationStatus: null,
  validationReason: null,
  createdAt: REVIEW_NOW,
}

function renderWithTooltip(ui: React.ReactNode) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('FastModeAnswerKeyBadge', () => {
  it('shows Kunci prefix for multi correct answers', () => {
    renderWithTooltip(<FastModeAnswerKeyBadge question={mcqMulti} />)
    expect(screen.getByText('Kunci A, C')).toBeInTheDocument()
  })

  it('shows tooltip with answer explanation on hover', async () => {
    const user = userEvent.setup()
    renderWithTooltip(<FastModeAnswerKeyBadge question={mcqMulti} />)

    await user.hover(screen.getByTestId('fast-mode-answer-key-badge'))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/Jawaban benar: pilihan A dan C/i)
  })
})

describe('FastModeTopicBadge', () => {
  it('shows first word of topic', () => {
    renderWithTooltip(<FastModeTopicBadge topic="Pemahaman Bacaan" />)
    expect(screen.getByText('Pemahaman')).toBeInTheDocument()
  })

  it('shows full topic in tooltip on hover', async () => {
    const user = userEvent.setup()
    renderWithTooltip(<FastModeTopicBadge topic="Pemahaman Bacaan" />)

    await user.hover(screen.getByTestId('fast-mode-topic-badge'))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/Topik: Pemahaman Bacaan/i)
  })
})
