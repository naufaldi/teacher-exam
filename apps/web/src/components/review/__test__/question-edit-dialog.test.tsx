import type { Question } from "@teacher-exam/shared"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { QuestionEditDialog } from "../question-edit-dialog"

const NOW = "2024-01-01T00:00:00.000Z"

function makeMcqQuestion(
  text: string,
  options: { a: string; b: string; c: string; d: string } = {
    a: "Option A",
    b: "Option B",
    c: "Option C",
    d: "Option D"
  }
): Question {
  return {
    _tag: "mcq_single" as const,
    id: "q-1",
    examId: "exam-1",
    number: 1,
    text,
    options,
    correct: "a" as const,
    topic: null,
    difficulty: null,
    status: "pending" as const,
    validationStatus: null,
    validationReason: null,
    createdAt: NOW
  } as Question
}

/**
 * Controller that uses the FIXED conditional-render gate (the actual fix).
 * Dialog only mounts when editingQuestion is not null — so reopening always
 * seeds from the current question.
 */
function FixedController({
  initialQuestion,
  regeneratedQuestion
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

      {editingQuestion !== null ?
        (
          <QuestionEditDialog
            open
            question={editingQuestion}
            onClose={() => setEditingQuestion(null)}
            onSave={vi.fn()}
          />
        ) :
        null}
    </div>
  )
}

describe("QuestionEditDialog — regression: shows regenerated content after close + reopen", () => {
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
  it("seeds textarea from current question on every fresh mount, not from stale first-mount state", async () => {
    const user = userEvent.setup()

    const originalQuestion = makeMcqQuestion("Original question text")
    const regeneratedQuestion = makeMcqQuestion("Regenerated question text")

    render(
      <FixedController
        initialQuestion={originalQuestion}
        regeneratedQuestion={regeneratedQuestion}
      />
    )

    // 1. Dialog is open with original question — verify old text
    expect(await screen.findByLabelText(/teks soal/i)).toHaveValue("Original question text")

    // 2. Close dialog via Batal (outside Radix portal buttons are ARIA-hidden while dialog is open)
    await user.click(screen.getByRole("button", { name: /batal/i }))

    await waitFor(() => {
      expect(screen.queryByLabelText(/teks soal/i)).not.toBeInTheDocument()
    })

    // 3. Simulate regenerate (store updates — same id q-1, new text)
    await user.click(screen.getByRole("button", { name: "simulate regenerate" }))

    // 4. Reopen dialog — must show the NEW regenerated text
    await user.click(screen.getByRole("button", { name: "reopen dialog" }))

    expect(await screen.findByLabelText(/teks soal/i)).toHaveValue("Regenerated question text")
  })
})

describe("QuestionEditDialog — math preview", () => {
  it("shows teacher preview without dollar signs for LaTeX stem", () => {
    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("Hasil dari $5.678 + 3.421$ adalah ....")}
        subject="matematika"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const preview = screen.getByTestId("edit-question-preview")
    expect(preview.textContent).not.toContain("$")
    expect(preview.querySelector(".katex")).not.toBeNull()
  })

  it("shows broken-math warning and insert bar for Matematika with imes", () => {
    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("Hasil dari $124 imes 36$ adalah ....")}
        subject="matematika"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByTestId("broken-math-warning")).toBeInTheDocument()
    expect(screen.getByTestId("math-insert-bar")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /panduan notasi matematika/i })).toHaveAttribute(
      "href",
      "/help/notasi-matematika"
    )
  })

  it("repairs imes on save for Matematika", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("Hasil dari $124 imes 36$ adalah ....")}
        subject="matematika"
        onClose={vi.fn()}
        onSave={onSave}
      />
    )

    await user.click(screen.getByRole("button", { name: /simpan perubahan/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Hasil dari $124 \\times 36$ adalah ...." })
    )
  })

  it("inserts times snippet at cursor when × button is clicked", async () => {
    const user = userEvent.setup()

    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("Hasil dari ")}
        subject="matematika"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const textarea = screen.getByLabelText(/teks soal/i)
    await user.click(textarea)
    await user.click(screen.getByRole("button", { name: /sisipkan kali/i }))

    expect(textarea).toHaveValue("Hasil dari  $\\times$ ")
  })

  it("shows teacher preview for each Matematika MCQ option without dollar signs", () => {
    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("Hasil dari $5.678 + 3.421$ adalah ....", {
          a: "$\\frac{5}{4}$",
          b: "$\\frac{5}{8}$",
          c: "$\\frac{15}{24}$",
          d: "$\\frac{30}{48}$"
        })}
        subject="matematika"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    for (const letter of ["a", "b", "c", "d"] as const) {
      const preview = screen.getByTestId(`edit-option-preview-${letter}`)
      expect(preview.textContent).not.toContain("$")
      expect(preview.querySelector(".katex")).not.toBeNull()
    }
  })

  it("updates option preview when option input changes", async () => {
    const user = userEvent.setup()

    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("Soal pecahan", {
          a: "Plain text",
          b: "Option B",
          c: "Option C",
          d: "Option D"
        })}
        subject="matematika"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const previewA = screen.getByTestId("edit-option-preview-a")
    expect(previewA.textContent).toContain("Plain text")
    expect(previewA.querySelector(".katex")).toBeNull()

    const inputs = screen.getAllByRole("textbox")
    const optionAInput = inputs.find((el) => (el as HTMLInputElement).value === "Plain text")
    expect(optionAInput).toBeDefined()
    await user.clear(optionAInput!)
    await user.type(optionAInput!, "$\\frac{1}{2}$")

    expect(previewA.textContent).not.toContain("$")
    expect(previewA.querySelector(".katex")).not.toBeNull()
  })

  it("shows option preview for non-Matematika subjects", () => {
    render(
      <QuestionEditDialog
        open
        question={makeMcqQuestion("What is 2 + 2?", {
          a: "Three",
          b: "Four",
          c: "Five",
          d: "Six"
        })}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const previewA = screen.getByTestId("edit-option-preview-a")
    expect(previewA.textContent).toContain("Three")
  })
})
