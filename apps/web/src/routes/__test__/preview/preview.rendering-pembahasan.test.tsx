import type { ExamDetailResponse, Question } from "@teacher-exam/shared"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { vi } from "vitest"
import { makeExamWithQuestions, makeMcqSingle } from "../../../test/fixtures/exam.js"
import { mockStreamDiscussion, previewTestCtx, renderPreviewPage, seedPreviewDraft } from "./setup.js"

describe("PreviewPage topics display", () => {
  it("shows multiple topics joined with middle dot in the paper header", () => {
    previewTestCtx.mockLoaderData = makeExamWithQuestions(["Matematika", "IPA"])
    renderPreviewPage()

    // The joined topics label should appear somewhere in the printed content
    expect(screen.getAllByText("Matematika · IPA").length).toBeGreaterThan(0)
  })

  it("shows a single topic without a separator", () => {
    previewTestCtx.mockLoaderData = makeExamWithQuestions(["Teks Narasi"])
    renderPreviewPage()

    expect(screen.getAllByText("Teks Narasi").length).toBeGreaterThan(0)
  })
})

describe("PreviewPage math rendering", () => {
  it("renders LaTeX in question text and options", async () => {
    seedPreviewDraft([{
      ...makeMcqSingle(1),
      text: "Hitung $\\frac{3}{4}$ dari 20.",
      options: {
        a: "$15$",
        b: "$10$",
        c: "$5$",
        d: "$20$"
      }
    }])

    const { container } = renderPreviewPage()

    const soalSection = container.querySelector("[data-print-section=\"soal\"]")
    await waitFor(() => {
      expect(soalSection?.querySelectorAll(".katex").length).toBeGreaterThan(1)
    })
    expect(soalSection?.textContent).not.toContain("$")
  })
})

describe("PreviewPage figure rendering", () => {
  it("renders generated figure specs in the preview paper", () => {
    seedPreviewDraft([{
      ...makeMcqSingle(1),
      topic: "Bangun Datar",
      text: "Perhatikan lingkaran berikut.",
      figure: { type: "circle", radius: 7, label: "r = 7 cm" }
    } as Question])

    const { container } = renderPreviewPage()

    expect(container.querySelector("[data-figure-svg]")).not.toBeNull()
  })
})

describe("Pembahasan tab", () => {
  it("renders Pembahasan tab trigger in the tab list", () => {
    previewTestCtx.mockLoaderData = makeExamWithQuestions(["Teks Narasi"])
    renderPreviewPage()

    expect(screen.getByRole("tab", { name: /pembahasan/i })).toBeInTheDocument()
  })

  it("renders Generate Pembahasan CTA when discussionMd is null", () => {
    previewTestCtx.mockLoaderData = { ...makeExamWithQuestions(["Teks Narasi"]), discussionMd: null }
    renderPreviewPage()

    const pembahasanSection = document.querySelector("[data-print-section=\"pembahasan\"]")
    expect(pembahasanSection).not.toBeNull()
    expect(within(pembahasanSection as HTMLElement).getByRole("button", { name: /generate pembahasan/i }))
      .toBeInTheDocument()
  })

  it("renders markdown read-only when discussionMd is non-null on load", () => {
    previewTestCtx.mockLoaderData = {
      ...makeExamWithQuestions(["Teks Narasi"]),
      discussionMd: "## 1. Soal\n**Jawaban Benar: B**\n\nPenjelasan singkat."
    }
    renderPreviewPage()

    const pembahasanSection = document.querySelector("[data-print-section=\"pembahasan\"]")
    expect(pembahasanSection).not.toBeNull()
    expect(within(pembahasanSection as HTMLElement).getByText(/Jawaban Benar/)).toBeInTheDocument()
    expect(within(pembahasanSection as HTMLElement).queryByRole("button", { name: /generate pembahasan/i })).not
      .toBeInTheDocument()
  })

  it("renders LaTeX inside pembahasan markdown", async () => {
    previewTestCtx.mockLoaderData = {
      ...makeExamWithQuestions(["Matematika"]),
      subject: "matematika",
      discussionMd: "## 1. Pecahan\n**Jawaban Benar: A**\n\nNilainya adalah $\\frac{3}{4}$."
    }

    const { container } = renderPreviewPage()

    const pembahasanSection = container.querySelector("[data-print-section=\"pembahasan\"]")
    await waitFor(() => {
      expect(pembahasanSection?.querySelector(".katex")).not.toBeNull()
    })
    expect(pembahasanSection?.textContent).not.toContain("$")
  })

  it("clicking Generate calls api.exams.streamDiscussion and renders returned markdown", async () => {
    previewTestCtx.mockLoaderData = { ...makeExamWithQuestions(["Teks Narasi"]), discussionMd: null }
    mockStreamDiscussion.mockImplementationOnce(async (
      _id: string,
      onDone: (exam: ExamDetailResponse) => void,
      _onError: (message: string) => void
    ) => {
      onDone({
        ...makeExamWithQuestions(["Teks Narasi"]),
        discussionMd: "## 1. Hasil\n\n**Jawaban Benar: A**\n\nOke."
      })
    })

    renderPreviewPage()

    const pembahasanSection = document.querySelector("[data-print-section=\"pembahasan\"]")
    const generateBtn = within(pembahasanSection as HTMLElement).getByRole("button", { name: /generate pembahasan/i })
    fireEvent.click(generateBtn)

    expect(mockStreamDiscussion).toHaveBeenCalledWith("exam-preview", expect.any(Function), expect.any(Function))
    expect(await screen.findByText(/Jawaban Benar/)).toBeInTheDocument()
  })

  it("shows Koneksi terputus error when stream fails with network error", async () => {
    previewTestCtx.mockLoaderData = { ...makeExamWithQuestions(["Teks Narasi"]), discussionMd: null }
    mockStreamDiscussion.mockImplementationOnce(async (
      _id: string,
      _onDone: (exam: ExamDetailResponse) => void,
      onError: (message: string) => void
    ) => {
      onError("Failed to fetch")
    })

    renderPreviewPage()

    const pembahasanSection = document.querySelector("[data-print-section=\"pembahasan\"]")
    fireEvent.click(within(pembahasanSection as HTMLElement).getByRole("button", { name: /generate pembahasan/i }))

    expect(await screen.findByText(/Koneksi terputus/i)).toBeInTheDocument()
  })

  it("Cetak Pembahasan button calls triggerPrint with pembahasan scope", () => {
    vi.useFakeTimers()
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})
    previewTestCtx.mockLoaderData = {
      ...makeExamWithQuestions(["Teks Narasi"]),
      discussionMd: "## Pembahasan"
    }
    renderPreviewPage()

    fireEvent.click(screen.getByRole("button", { name: /cetak pembahasan/i }))

    expect(document.body.dataset["printScope"]).toBe("pembahasan")
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it("CSS includes pembahasan print scope rules", () => {
    previewTestCtx.mockLoaderData = makeExamWithQuestions(["Teks Narasi"])
    const { container } = renderPreviewPage()
    const styleText = Array.from(container.querySelectorAll("style"))
      .map((s) => s.textContent ?? "")
      .join("\n")

    expect(styleText).toContain("body[data-print-scope=\"pembahasan\"]")
  })
})
