import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { makeExam } from "../../../test/fixtures/exam.js"
import { DuplicateConfirmDialog } from "../duplicate-confirm-dialog.js"

describe("DuplicateConfirmDialog", () => {
  it("shows the derived unified title, not the verbatim source title", () => {
    render(
      <DuplicateConfirmDialog
        exam={makeExam({ title: "Old Verbatim Title", topics: ["Ide Pokok"] })}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />
    )
    expect(screen.getByText(/Bahasa Indonesia \/ Kelas 5 \/ formatif/)).toBeInTheDocument()
    expect(screen.queryByText("Old Verbatim Title")).not.toBeInTheDocument()
  })

  it("shows exam metadata: question count placeholder, subject, grade, topic", () => {
    render(
      <DuplicateConfirmDialog
        exam={makeExam({ subject: "pendidikan_pancasila", grade: 6, topics: ["Nilai-Nilai Pancasila"] })}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />
    )
    expect(screen.getByText(/Pendidikan Pancasila · Kelas 6/)).toBeInTheDocument()
    expect(screen.getByText(/Nilai-Nilai Pancasila/)).toBeInTheDocument()
  })

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn()
    render(
      <DuplicateConfirmDialog
        exam={makeExam()}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isPending={false}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /duplikat/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("calls onOpenChange(false) when cancel button is clicked", () => {
    const onOpenChange = vi.fn()
    render(
      <DuplicateConfirmDialog
        exam={makeExam()}
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        isPending={false}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /batal/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("disables confirm button while isPending", () => {
    render(
      <DuplicateConfirmDialog
        exam={makeExam()}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={true}
      />
    )
    expect(screen.getByRole("button", { name: /duplikat/i })).toBeDisabled()
  })
})
