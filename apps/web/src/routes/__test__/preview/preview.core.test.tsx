import { brandExamId, type ExamWithQuestions } from "@teacher-exam/shared"
import { act, fireEvent, screen, within } from "@testing-library/react"
import { vi } from "vitest"
import { mockApiResolvedValueOnce } from "../../../lib/api-test-utils.js"
import { examDraftStore } from "../../../lib/exam-draft-store.js"
import { makeExamWithQuestions, makeMcqMulti, makeMcqSingle, makeTrueFalse } from "../../../test/fixtures/exam.js"
import { closestByAttr, getLoader, mockExamsGet, renderPreviewPage, seedPreviewDraft } from "./setup.js"

describe("variable points per question", () => {
  function seedDraftWithQuestions(count: number) {
    const questions = Array.from({ length: count }, (_, i) => makeMcqSingle(i + 1))
    examDraftStore.setQuestions(questions)
    examDraftStore.setReviewMode("fast")
    examDraftStore.setConfig({
      subject: "bahasa_indonesia",
      grade: 6,
      topic: "Teks Narasi",
      examType: "formatif"
    })
    examDraftStore.setMetadata({
      schoolName: "SD Nusantara",
      academicYear: "2025/2026",
      examDate: "23 April 2026",
      durationMinutes: 60,
      instructions: "Pilih jawaban yang benar."
    })
  }

  it("25 soal → 4 poin per soal, 100 total poin", () => {
    seedDraftWithQuestions(25)
    renderPreviewPage()
    expect(screen.getByText("4 poin")).toBeInTheDocument()
    expect(screen.getByText("Total: 100 poin")).toBeInTheDocument()
  })

  it("10 soal → 10 poin per soal, 100 total poin", () => {
    seedDraftWithQuestions(10)
    renderPreviewPage()
    expect(screen.getByText("10 poin")).toBeInTheDocument()
    expect(screen.getByText("Total: 100 poin")).toBeInTheDocument()
  })
})

describe("PreviewPage loader", () => {
  it("seeds draft config from the loaded exam", async () => {
    const exam: ExamWithQuestions = {
      ...makeExamWithQuestions(["Nilai Pancasila", "Gotong Royong"]),
      id: brandExamId("exam-loaded"),
      subject: "pendidikan_pancasila",
      grade: 5,
      examType: "sas",
      classContext: "Siswa perlu contoh konkret."
    }
    mockApiResolvedValueOnce(mockExamsGet, exam)

    await getLoader()({ deps: { examId: "exam-loaded" } })

    expect(mockExamsGet).toHaveBeenCalledWith("exam-loaded")
    expect(examDraftStore.getSnapshot()).toMatchObject({
      subject: "pendidikan_pancasila",
      grade: 5,
      topic: "Nilai Pancasila, Gotong Royong",
      classContext: "Siswa perlu contoh konkret.",
      metadata: {
        examType: "sas"
      }
    })
  })
})

describe("PreviewPage — multi-subject labels", () => {
  it("renders \"IPAS\" label in subtitle when draft subject is ipas", () => {
    // Seed store with ipas — force-cast to satisfy current narrow type (this cast
    // is what we are about to remove from production code)
    examDraftStore.setConfig({
      subject: "ipas",
      grade: 5,
      topic: "Ekosistem",
      examType: "formatif"
    })
    renderPreviewPage()
    // subtitle = "<examType> · <subjectLabel> — Kelas 5 SD"
    // Before fix: SUBJECT_LABELS['ipas'] is undefined → fallback is raw 'ipas' (lowercase)
    // After fix:  SUBJECT_LABEL['ipas'] = 'IPAS'
    expect(screen.queryAllByText(/\bipas\b/).length).toBe(0)
    expect(screen.getAllByText(/IPAS/).length).toBeGreaterThan(0)
  })

  it("renders \"Bahasa Inggris\" label when draft subject is bahasa_inggris", () => {
    examDraftStore.setConfig({
      subject: "bahasa_inggris",
      grade: 6,
      topic: "Reading Comprehension",
      examType: "formatif"
    })
    renderPreviewPage()
    expect(screen.queryAllByText(/\bbahasa_inggris\b/).length).toBe(0)
    expect(screen.getAllByText(/Bahasa Inggris/).length).toBeGreaterThan(0)
  })

  it("loader stores ipas subject in draft store without casting it away", async () => {
    const exam: ExamWithQuestions = {
      ...makeExamWithQuestions(["Ekosistem"]),
      subject: "ipas",
      grade: 5
    }
    mockApiResolvedValueOnce(mockExamsGet, exam)

    await getLoader()({ deps: { examId: exam.id } })

    expect(examDraftStore.getSnapshot().subject).toBe("ipas")
  })
})

describe("PreviewPage print flow", () => {
  it("keeps print scope active until afterprint fires", () => {
    vi.useFakeTimers()
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})

    renderPreviewPage()
    fireEvent.click(screen.getByRole("button", { name: /cetak soal/i }))

    expect(document.body.dataset["printScope"]).toBe("soal")

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.dataset["printScope"]).toBe("soal")

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(document.body.dataset["printScope"]).toBe("soal")

    act(() => {
      window.dispatchEvent(new Event("afterprint"))
    })

    expect(document.body.dataset["printScope"]).toBeUndefined()
  })

  it("keeps preview screen wording and toolbar outside printable content", () => {
    renderPreviewPage()

    const printable = document.querySelector("[data-print-content]")
    expect(printable).toBeInstanceOf(HTMLElement)
    expect(within(printable as HTMLElement).queryByText("Preview Lembar")).not.toBeInTheDocument()
    expect(
      within(printable as HTMLElement).queryByRole("button", { name: /unduh \/ cetak/i })
    ).not.toBeInTheDocument()

    const previewTitle = screen.getByRole("heading", { name: "Preview Lembar" })
    const previewHeader = closestByAttr(previewTitle, "data-screen-only")
    expect(previewHeader).toHaveAttribute("data-no-print")

    const exportButton = screen.getByRole("button", { name: /unduh \/ cetak/i })
    const toolbar = closestByAttr(exportButton, "data-screen-only")
    expect(toolbar).toHaveAttribute("data-no-print")
  })

  it("keeps print section scope rules colocated with the preview route", () => {
    const { container } = renderPreviewPage()
    const styleText = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n")

    expect(styleText).toContain("body[data-print-scope=\"soal\"] [data-print-section=\"lj\"]")
    expect(styleText).toContain("body[data-print-scope=\"lj\"] [data-print-section=\"kunci\"]")
    expect(styleText).toContain("body[data-print-scope=\"kunci\"] [data-print-section=\"soal\"]")
  })
})

describe("Soal section renders correct structure per question type", () => {
  it("mcq_single: renders A/B/C/D option list without special hint text", () => {
    seedPreviewDraft([makeMcqSingle(1, "b")])
    renderPreviewPage()

    // Should render options list
    const soalSection = document.querySelector("[data-print-section=\"soal\"]")
    expect(soalSection).not.toBeNull()
    expect(within(soalSection as HTMLElement).getByText("a.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("b.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("c.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("d.")).toBeInTheDocument()
    // No multi-select hint for single choice
    expect(within(soalSection as HTMLElement).queryByText(/pilih dua\/tiga/i)).not.toBeInTheDocument()
  })

  it("mcq_multi: renders A/B/C/D option list and shows hint text in question", () => {
    seedPreviewDraft([makeMcqMulti(1, ["a", "c"])])
    renderPreviewPage()

    const soalSection = document.querySelector("[data-print-section=\"soal\"]")
    expect(soalSection).not.toBeNull()
    // Hint embedded in the question text (factory sets it)
    expect(within(soalSection as HTMLElement).getByText(/pilih dua\/tiga jawaban yang benar/i)).toBeInTheDocument()
    // Options still rendered
    expect(within(soalSection as HTMLElement).getByText("a.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("b.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("c.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("d.")).toBeInTheDocument()
  })

  it("true_false: renders a table with Pernyataan header and B/S columns, one row per statement", () => {
    seedPreviewDraft([makeTrueFalse(1, [true, false, true])])
    renderPreviewPage()

    const soalSection = document.querySelector("[data-print-section=\"soal\"]")
    expect(soalSection).not.toBeNull()
    // Table headers
    expect(within(soalSection as HTMLElement).getByText("Pernyataan")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("B")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("S")).toBeInTheDocument()
    // Statement rows — 3 statements in fixture
    expect(within(soalSection as HTMLElement).getByText("Pernyataan 1")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("Pernyataan 2")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("Pernyataan 3")).toBeInTheDocument()
    // No A/B/C/D option letters for true_false
    expect(within(soalSection as HTMLElement).queryByText("a.")).not.toBeInTheDocument()
  })
})

describe("Kunci Jawaban uses correct labels per question type", () => {
  it("mcq_single with correct \"b\" → shows \"B\"", () => {
    seedPreviewDraft([makeMcqSingle(1, "b")])
    renderPreviewPage()

    const kunciSection = document.querySelector("[data-print-section=\"kunci\"]")
    expect(kunciSection).not.toBeNull()
    expect(within(kunciSection as HTMLElement).getByText("B")).toBeInTheDocument()
  })

  it("mcq_multi with correct [\"a\",\"c\"] → shows \"A, C\"", () => {
    seedPreviewDraft([makeMcqMulti(1, ["a", "c"])])
    renderPreviewPage()

    const kunciSection = document.querySelector("[data-print-section=\"kunci\"]")
    expect(kunciSection).not.toBeNull()
    expect(within(kunciSection as HTMLElement).getByText("A, C")).toBeInTheDocument()
  })

  it("true_false with [true, false, true] → shows \"B, S, B\"", () => {
    seedPreviewDraft([makeTrueFalse(1, [true, false, true])])
    renderPreviewPage()

    const kunciSection = document.querySelector("[data-print-section=\"kunci\"]")
    expect(kunciSection).not.toBeNull()
    expect(within(kunciSection as HTMLElement).getByText("B, S, B")).toBeInTheDocument()
  })
})
