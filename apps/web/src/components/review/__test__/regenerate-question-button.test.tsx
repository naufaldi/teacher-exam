import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegenerateQuestionButton } from '../regenerate-question-button.js'

describe('RegenerateQuestionButton', () => {
  it('shows Meregenerate with spinning icon when loading', () => {
    render(
      <RegenerateQuestionButton
        loading
        failedRetry={false}
        onClick={vi.fn()}
        testId="fast-regenerate-1"
      />,
    )

    const btn = screen.getByTestId('fast-regenerate-1')
    expect(btn).toHaveTextContent('Meregenerate…')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn.querySelector('.animate-spin')).not.toBeNull()
  })

  it('shows Regenerate when idle', () => {
    render(
      <RegenerateQuestionButton
        loading={false}
        failedRetry={false}
        onClick={vi.fn()}
        testId="fast-regenerate-1"
      />,
    )

    expect(screen.getByTestId('fast-regenerate-1')).toHaveTextContent('Regenerate')
  })

  it('shows Coba lagi when failedRetry', () => {
    render(
      <RegenerateQuestionButton
        loading={false}
        failedRetry
        onClick={vi.fn()}
        testId="fast-regenerate-1"
      />,
    )

    expect(screen.getByTestId('fast-regenerate-1')).toHaveTextContent('Coba lagi')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <RegenerateQuestionButton
        loading={false}
        failedRetry={false}
        onClick={onClick}
        testId="fast-regenerate-1"
      />,
    )

    await user.click(screen.getByTestId('fast-regenerate-1'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
