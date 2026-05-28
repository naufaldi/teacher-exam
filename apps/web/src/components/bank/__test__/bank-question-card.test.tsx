import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BankQuestion } from '@teacher-exam/shared'
import { BankQuestionCard } from '../bank-question-card.js'

vi.mock('../../math-text.js', () => ({
  MathText: ({ text }: { text: string }) => <span data-testid="math-text">{text}</span>,
}))

const sampleQuestion: BankQuestion = {
  id: 'bank-1' as BankQuestion['id'],
  questionId: 'q-1' as BankQuestion['questionId'],
  userId: 'user-1',
  subject: 'ipas',
  grade: 5,
  topics: ['Energi'],
  difficulty: 'mudah',
  type: 'mcq_single',
  payload: {},
  isPublic: true,
  usageCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  text: 'Apa itu energi?',
  optionA: 'Sumber daya alam',
  optionB: 'Cuaca',
  optionC: 'Angin',
  optionD: 'Hujan',
  correctAnswer: 'a',
}

describe('BankQuestionCard', () => {
  it('renders MathText stem and calls onSelect when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<BankQuestionCard item={sampleQuestion} onSelect={onSelect} />)

    expect(screen.getByTestId('math-text')).toHaveTextContent('Apa itu energi?')
    expect(screen.getByText('IPAS').className).toMatch(/subject-ipas/)

    await user.click(screen.getByRole('button', { name: /Pratinjau soal/i }))
    expect(onSelect).toHaveBeenCalledWith(sampleQuestion)
  })
})
