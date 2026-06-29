import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeExam } from "../../../test/fixtures/exam.js"
import { examToSheetRow } from "../sheet-table.adapters.js"
import { SheetTable } from "../sheet-table.js"

describe("SheetTable", () => {
  const handlers = {
    onPreview: vi.fn(),
    onEdit: vi.fn(),
    onPrint: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(async () => {}),
    onCorrection: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })
  it("history final row shows Preview and opens modal on title click", async () => {
    const user = userEvent.setup()
    const row = examToSheetRow(makeExam({ status: "final", title: "Ujian Final BI" }))

    render(<SheetTable variant="history" rows={[row]} handlers={handlers} />)

    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ujian Final BI" }))
    expect(handlers.onPreview).toHaveBeenCalledWith(row)
  })

  it("dashboard-recent draft row shows Edit", () => {
    const row = examToSheetRow(makeExam({ status: "draft" }))

    render(<SheetTable variant="dashboard-recent" rows={[row]} handlers={handlers} />)

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Pratinjau|Preview/i })).not.toBeInTheDocument()
  })
})
