import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { Question } from '@teacher-exam/shared'
import { QuestionEditDialog } from '../question-edit-dialog'

const NOW = '2024-01-01T00:00:00.000Z'

function makeMcqQuestion(text: string): Question {
  return {
    _tag: 'mcq_single' as const,
    id: 'q-1',
    examId: 'exam-1',
    number: 1,
    text,
    options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
    correct: 'a' as const,
    topic: null,
    difficulty: null,
    status: 'pending' as const,
    validationStatus: null,
    validationReason: null,
    createdAt: NOW,
  } as Question
}

/**
 * Controller that uses the FIXED conditional-render gate (the actual fix).
 * Dialog only mounts when editingQuestion is not null — so reopening always
 * seeds from the current question.
 */
function FixedController({
  initialQuestion,
  regeneratedQuestion,
}: {
  initialQuestion: Question
  regeneratedQuestion: Question
}) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(initialQuestion)
  const [hasRegenerated, setHasRegenerated] = useState(false)

  const handleReopen = () => {
    setEditingQuestion(hasRegenerated ? regeneratedQuestion : initialQuestion)
  }

  return (
    <div>
      <button onClick={() => setHasRegenerated(true)}>simulate regenerate</button>
      <button onClick={handleReopen}>reopen dialog</button>

      {editingQuestion !== null ? (
        <QuestionEditDialog
          open
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={vi.fn()}
        />
      ) : null}
    </div>
  )
}

describe('QuestionEditDialog — regression: shows regenerated content after close + reopen', () => {
  /**
   * Sequence that reproduces the bug:
   * 1. Open dialog with q1_old → editState seeded from old text
   * 2. Close dialog via Batal
   * 3. Regenerate: store now holds q1_regenerated (same id, new text)
   * 4. Reopen dialog → must show new text, not stale old text
   *
   * With the OLD parent pattern (always-rendered, open toggled), step 4 shows
   * old text because the component instance persists with stale editState.
   *
   * With the FIXED parent pattern (conditional render), the dialog unmounts on
   * close, so each reopen seeds editState from the current question prop.
   */
  it('seeds textarea from current question on every fresh mount, not from stale first-mount state', async () => {
    const user = userEvent.setup()

    const originalQuestion = makeMcqQuestion('Original question text')
    const regeneratedQuestion = makeMcqQuestion('Regenerated question text')

    render(
      <FixedController
        initialQuestion={originalQuestion}
        regeneratedQuestion={regeneratedQuestion}
      />,
    )

    // 1. Dialog is open with original question — verify old text
    expect(await screen.findByLabelText(/teks soal/i)).toHaveValue('Original question text')

    // 2. Close dialog via Batal (outside Radix portal buttons are ARIA-hidden while dialog is open)
    await user.click(screen.getByRole('button', { name: /batal/i }))

    await waitFor(() => {
      expect(screen.queryByLabelText(/teks soal/i)).not.toBeInTheDocument()
    })

    // 3. Simulate regenerate (store updates — same id q-1, new text)
    await user.click(screen.getByRole('button', { name: 'simulate regenerate' }))

    // 4. Reopen dialog — must show the NEW regenerated text
    await user.click(screen.getByRole('button', { name: 'reopen dialog' }))

    expect(await screen.findByLabelText(/teks soal/i)).toHaveValue('Regenerated question text')
  })
})
