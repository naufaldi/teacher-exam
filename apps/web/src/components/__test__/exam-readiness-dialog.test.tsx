import type { ExamPilotReadiness } from "@teacher-exam/shared"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ExamReadinessDialog } from "../exam-readiness-dialog.js"

describe("ExamReadinessDialog", () => {
  it("shows neutral readiness choices and a dismiss action", () => {
    render(
      <ExamReadinessDialog
        open
        formUrl="https://forms.gle/example"
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole("heading", { name: "Apakah lembar ini siap digunakan?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ya, siap digunakan/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ya, setelah diedit/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^belum/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nanti saja" })).toBeInTheDocument()
  })

  it("submits once and isolates loading to the selected choice", async () => {
    let resolveSubmit: (value: void) => void = () => {}
    const onSubmit = vi.fn((_value: ExamPilotReadiness) =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve
      })
    )
    render(
      <ExamReadinessDialog
        open
        formUrl="https://forms.gle/example"
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /ya, setelah diedit/i }))
    expect(onSubmit).toHaveBeenCalledWith("ready_after_edit")
    expect(screen.getByRole("button", { name: /ya, setelah diedit/i })).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("button", { name: /ya, siap digunakan/i })).toBeDisabled()
    expect(screen.queryAllByText("Menyimpan...")).toHaveLength(1)

    resolveSubmit()
    expect(await screen.findByText("Terima kasih, masukan Anda sudah tersimpan")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ceritakan lebih lanjut" })).toHaveAttribute(
      "href",
      "https://forms.gle/example"
    )
  })

  it("keeps the selection and offers retry after failure", async () => {
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined)
    render(
      <ExamReadinessDialog
        open
        formUrl={null}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /^belum/i }))
    expect(await screen.findByText("Masukan belum tersimpan.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    expect(await screen.findByText("Terima kasih, masukan Anda sudah tersimpan")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ceritakan lebih lanjut" })).not.toBeInTheDocument()
  })

  it("marks animated state replacement as reduced-motion safe", () => {
    render(
      <ExamReadinessDialog
        open
        formUrl={null}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId("readiness-dialog-state").className).toContain("motion-reduce:transition-none")
  })
})
