import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BankQuestionReadonlyBody } from '../bank-question-readonly-body.js'

vi.mock('../../math-text.js', () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}))

describe('BankQuestionReadonlyBody', () => {
  it('highlights correct option and renders Kunci badge', () => {
    render(
      <BankQuestionReadonlyBody
        question={{
          text: 'Apa itu energi?',
          optionA: 'Matahari',
          optionB: 'Batu',
          optionC: 'Air',
          optionD: 'Tanah',
          correctAnswer: 'a',
        }}
      />,
    )

    expect(screen.getByText('Apa itu energi?')).toBeInTheDocument()
    expect(screen.getByText('Kunci A')).toBeInTheDocument()
    expect(screen.getByTestId('bank-readonly-option-a')).toHaveClass('bg-success-bg')
    expect(screen.getByTestId('bank-readonly-option-b')).not.toHaveClass('bg-success-bg')
  })
})
