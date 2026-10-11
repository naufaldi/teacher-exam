import { screen } from "@testing-library/react"
import { makeExamWithQuestions } from "../../../test/fixtures/exam.js"
import { mockExamExport, previewTestCtx, renderPreviewPage } from "./setup.js"

describe("Preview kisi-kisi and kartu soal", () => {
  it("downloads both sheets as docx next to the other export controls", () => {
    previewTestCtx.mockLoaderData = makeExamWithQuestions(["Teks Narasi"], {
      overrides: { status: "final" }
    })
    renderPreviewPage()

    screen.getByRole("button", { name: "Kisi-kisi" }).click()
    screen.getByRole("button", { name: "Kartu soal" }).click()

    expect(mockExamExport).toHaveBeenNthCalledWith(1, "exam-preview", "docx", "kisi_kisi")
    expect(mockExamExport).toHaveBeenNthCalledWith(2, "exam-preview", "docx", "kartu_soal")
  })
})
