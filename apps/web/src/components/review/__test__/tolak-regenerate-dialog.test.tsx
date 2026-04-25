import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TolakRegenerateDialog } from '../tolak-regenerate-dialog'

describe('TolakRegenerateDialog', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders heading with the question number', () => {
    render(
      <TolakRegenerateDialog
        open
        questionNumber={3}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/soal #3/i)).toBeInTheDocument()
  })

  it('places default focus on the [Ganti] action button', () => {
    render(
      <TolakRegenerateDialog
        open
        questionNumber={1}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const gantiButton = screen.getByRole('button', { name: /^ganti$/i })
    expect(document.activeElement).toBe(gantiButton)
  })

  it('calls onConfirm with undefined when submitted with no hint', async () => {
    const onConfirm = vi.fn()
    render(
      <TolakRegenerateDialog
        open
        questionNumber={1}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^ganti$/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('calls onConfirm with the trimmed hint when provided', async () => {
    const onConfirm = vi.fn()
    render(
      <TolakRegenerateDialog
        open
        questionNumber={1}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )
    const textarea = screen.getByPlaceholderText(/petunjuk untuk ai/i)
    await user.type(textarea, '  terlalu sulit  ')
    await user.click(screen.getByRole('button', { name: /^ganti$/i }))
    expect(onConfirm).toHaveBeenCalledWith('terlalu sulit')
  })

  it('calls onClose without onConfirm when [Batal] is clicked', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <TolakRegenerateDialog
        open
        questionNumber={1}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^batal$/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('pre-fills the textarea with initialHint (retry path)', () => {
    render(
      <TolakRegenerateDialog
        open
        questionNumber={2}
        initialHint="terlalu sulit, ganti topik"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const textarea = screen.getByPlaceholderText(/petunjuk untuk ai/i) as HTMLTextAreaElement
    expect(textarea.value).toBe('terlalu sulit, ganti topik')
  })

  it('treats whitespace-only hint as undefined', async () => {
    const onConfirm = vi.fn()
    render(
      <TolakRegenerateDialog
        open
        questionNumber={1}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )
    const textarea = screen.getByPlaceholderText(/petunjuk untuk ai/i)
    await user.type(textarea, '    ')
    await user.click(screen.getByRole('button', { name: /^ganti$/i }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })
})
