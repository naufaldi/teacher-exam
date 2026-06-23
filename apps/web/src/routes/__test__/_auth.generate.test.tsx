import type * as TanStackRouter from "@tanstack/react-router"
import type { CurriculumCatalogResponse } from "@teacher-exam/shared"
import type * as UiModule from "@teacher-exam/ui"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mockApiFailOnce, mockApiResolvedValueOnce } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"
import { api, ApiError } from "../../lib/api.js"
import { makeExamWithQuestions } from "../../test/fixtures/exam.js"
import { Route } from "../_auth.generate.js"

const mockNavigate = vi.fn<(opts: unknown) => Promise<void>>()

const READY_CURRICULUM_CATALOG: CurriculumCatalogResponse = [
  {
    key: "bahasa_indonesia",
    label: "Bahasa Indonesia",
    family: "bahasa",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "pendidikan_pancasila",
    label: "Pendidikan Pancasila",
    family: "pancasila",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "ipas",
    label: "IPAS",
    family: "ipas",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "bahasa_inggris",
    label: "Bahasa Inggris",
    family: "bahasa",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "matematika",
    label: "Matematika",
    family: "matematika",
    optional: false,
    grades: [
      { grade: 5, phase: "C", availability: "stubbed" },
      { grade: 6, phase: "C", availability: "stubbed" }
    ]
  }
]

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: { component: React.ComponentType }) => ({
      options: opts,
      useSearch: () => ({ simulate: undefined })
    }),
    useNavigate: () => mockNavigate,
    useSearch: () => ({ simulate: undefined })
  }
})

vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      ai: { generate: vi.fn() },
      curriculum: { catalog: vi.fn() }
    }
  }
})

// Replace Radix Button with a plain <button> that ignores `disabled`.
// The Generate button is disabled by default until the form is filled — this
// lets us test the generate flow without Radix Select interaction.
vi.mock("@teacher-exam/ui", async (importOriginal) => {
  const orig = await importOriginal<typeof UiModule>()
  const React = await import("react")
  const SelectContext = React.createContext<(value: string) => void>(() => {})
  return {
    ...orig,
    Button: (
      { children, onClick, type }: {
        onClick?: () => void
        children: React.ReactNode
        type?: "button" | "submit" | "reset"
      }
    ) => <button type={type ?? "button"} onClick={onClick}>{children}</button>,
    Select: (
      { children, onValueChange }: {
        children: React.ReactNode
        onValueChange?: (value: string) => void
      }
    ) => (
      <SelectContext.Provider value={onValueChange ?? (() => {})}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <SelectContext.Consumer>
        {(onSelect) => (
          <button type="button" data-value={value} onClick={() => onSelect(value)}>
            {children}
          </button>
        )}
      </SelectContext.Consumer>
    ),
    SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => <div id={id}>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>
  }
})

const mockApi = api as unknown as {
  ai: { generate: ReturnType<typeof vi.fn> }
  curriculum: { catalog: ReturnType<typeof vi.fn> }
}

function renderGeneratePage() {
  const GeneratePage = (Route as unknown as { options: { component: React.ComponentType } }).options
    .component
  return render(<GeneratePage />)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  mockApi.curriculum.catalog.mockReturnValue(new Promise(() => {}))
})

afterEach(() => {
  vi.useRealTimers()
})

async function clickGenerateAndFlush() {
  // fireEvent.click is synchronous — avoids waiting for Radix Dialog animations
  fireEvent.click(screen.getByRole("button", { name: /generate lembar/i }))

  // advanceTimersByTimeAsync advances virtual time to a fixed point AND flushes
  // microtasks (Promise chains) between each timer fire — unlike runAllTimers()
  // which causes an infinite loop when a setInterval is active (tips cycling,
  // progress interval). 20s covers GENERATE_DURATION_MS (7000 or 18000) + 450ms nav delay.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20_000)
  })
}

describe("Jumlah Soal input", () => {
  it("offers IPAS and Bahasa Inggris in the subject selector", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("Kelas 5 SD"))

    expect(screen.getByText("IPAS")).toBeInTheDocument()
    expect(screen.getByText("Bahasa Inggris")).toBeInTheDocument()
  })

  it("shows only ready subjects after choosing Kelas 5", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 5 SD"))

    expect(screen.getByRole("button", { name: "Bahasa Indonesia" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pendidikan Pancasila" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "IPAS" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bahasa Inggris" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Matematika" })).not.toBeInTheDocument()
  })

  it("defaults to 20 for default jenis (formatif)", () => {
    renderGeneratePage()
    const input = screen.getByLabelText("Jumlah Soal") as HTMLInputElement
    expect(input.value).toBe("20")
  })

  it("auto-fills to 25 when UAS (sas) jenis is selected", () => {
    renderGeneratePage()
    fireEvent.click(screen.getByText("UAS"))
    const input = screen.getByLabelText("Jumlah Soal") as HTMLInputElement
    expect(input.value).toBe("25")
  })

  it("shows error when value is below 5", () => {
    renderGeneratePage()
    const input = screen.getByLabelText("Jumlah Soal")
    fireEvent.change(input, { target: { value: "3" } })
    expect(screen.getByText("Minimum 5 soal")).toBeInTheDocument()
  })

  it("shows error when value is above 50", () => {
    renderGeneratePage()
    const input = screen.getByLabelText("Jumlah Soal")
    fireEvent.change(input, { target: { value: "51" } })
    expect(screen.getByText("Maksimum 50 soal")).toBeInTheDocument()
  })

  it("api.ai.generate is called with totalSoal in body", async () => {
    mockApiResolvedValueOnce(mockApi.ai.generate, makeExamWithQuestions("exam_abc"))

    renderGeneratePage()

    // Change totalSoal to 25
    const input = screen.getByLabelText("Jumlah Soal")
    fireEvent.change(input, { target: { value: "25" } })

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({ totalSoal: 25 })
    )
  })
})

describe("GeneratePage — runGenerate flow", () => {
  it("calls api.ai.generate and navigates to /review with examId on success", async () => {
    mockApiResolvedValueOnce(mockApi.ai.generate, makeExamWithQuestions("exam_abc"))

    renderGeneratePage()
    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/review",
        search: expect.objectContaining({
          examId: "exam_abc",
          from: "generate"
        })
      })
    )
  })

  it("keeps progress dialog open until navigation (no premature close)", async () => {
    mockApiResolvedValueOnce(mockApi.ai.generate, makeExamWithQuestions("exam_abc"))

    renderGeneratePage()

    fireEvent.click(screen.getByRole("button", { name: /generate lembar/i }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(mockNavigate).toHaveBeenCalledOnce()
  })

  it("does NOT navigate when api.ai.generate rejects", async () => {
    mockApiFailOnce(mockApi.ai.generate, new Error("AI generation failed"))

    renderGeneratePage()
    await clickGenerateAndFlush()

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("shows the API error message in the failure dialog", async () => {
    mockApiFailOnce(
      mockApi.ai.generate,
      new ApiError({
        message: "Expected 40 questions, got 20",
        code: "AI_GENERATION_ERROR",
        status: 502
      })
    )

    renderGeneratePage()
    await clickGenerateAndFlush()

    expect(screen.getByRole("dialog")).toHaveTextContent("Expected 40 questions, got 20")
  })

  it("uses the dynamic examId from api response, not a fixed value", async () => {
    mockApiResolvedValueOnce(mockApi.ai.generate, makeExamWithQuestions("exam_from_server_42"))

    renderGeneratePage()
    await clickGenerateAndFlush()

    const call = mockNavigate.mock.calls[0]?.[0] as Record<string, unknown>
    const search = call?.["search"] as Record<string, unknown>
    expect(search?.["examId"]).toBe("exam_from_server_42")
  })
})

describe("GeneratePage — Matematika subject", () => {
  it("offers Matematika non-diagram topik per grade without diagram topics", async () => {
    const { getTopicsForGenerate } = await import("../../lib/generate-topics.js")
    const { render: rtlRender } = await import("@testing-library/react")
    const { TopicMultiSelect } = await import("../../components/generate/topic-multi-select.js")

    const k5 = getTopicsForGenerate("matematika", 5)
    const k6 = getTopicsForGenerate("matematika", 6)

    expect(k5).toContain("Pecahan, Desimal, dan Persen")
    expect(k6).toContain("Pecahan, Desimal, Rasio, dan Persen")
    expect(k5).not.toContain("Bangun Datar")
    expect(k6).not.toContain("Bidang Koordinat")

    rtlRender(
      <TopicMultiSelect
        options={k5}
        selected={[]}
        onChange={() => {}}
      />
    )
    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))

    expect(screen.getByText("Pecahan, Desimal, dan Persen")).toBeInTheDocument()
    expect(screen.queryByText("Bangun Datar")).not.toBeInTheDocument()
  })
})

describe("GeneratePage — grade-aware topik", () => {
  it("prompts to pick kelas before topik options are available", () => {
    renderGeneratePage()
    expect(screen.getByText("Pilih kelas dulu untuk melihat topik Bab.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /pilih topik/i })).toHaveTextContent("Pilih kelas dulu")
  })
})

describe("Atur komposisi panel", () => {
  it("is collapsed by default: the 3 number inputs are not visible", () => {
    renderGeneratePage()
    expect(screen.queryByLabelText(/PG Pilihan Tunggal/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/PG Pilihan Jamak/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Benar\/Salah/i)).not.toBeInTheDocument()
  })

  it("SAS auto-fill: selecting UAS fills {mcqSingle:15, mcqMulti:5, trueFalse:5} when expanded", () => {
    renderGeneratePage()
    // Select SAS jenis
    fireEvent.click(screen.getByText("UAS"))
    // Expand the panel
    fireEvent.click(screen.getByRole("button", { name: /atur komposisi/i }))
    // Inputs should now be visible with correct defaults
    expect((screen.getByLabelText(/PG Pilihan Tunggal/i) as HTMLInputElement).value).toBe("15")
    expect((screen.getByLabelText(/PG Pilihan Jamak/i) as HTMLInputElement).value).toBe("5")
    expect((screen.getByLabelText(/Benar\/Salah/i) as HTMLInputElement).value).toBe("5")
  })

  it("shows sum validation error when composition does not equal totalSoal", () => {
    renderGeneratePage()
    // Expand the panel
    fireEvent.click(screen.getByRole("button", { name: /atur komposisi/i }))
    // Break the sum: change mcqSingle to 10 (default total is 20, so 10+0+0=10 !== 20)
    const mcqSingleInput = screen.getByLabelText(/PG Pilihan Tunggal/i)
    fireEvent.change(mcqSingleInput, { target: { value: "10" } })
    expect(screen.getByText("Total harus sama dengan 20")).toBeInTheDocument()
  })

  it("includes composition in the API payload on submit", async () => {
    mockApiResolvedValueOnce(mockApi.ai.generate, makeExamWithQuestions("exam_abc"))

    renderGeneratePage()
    // Expand panel; default formatif composition is {20,0,0} which sums to 20 == totalSoal
    fireEvent.click(screen.getByRole("button", { name: /atur komposisi/i }))

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        composition: expect.objectContaining({ mcqSingle: 20, mcqMulti: 0, trueFalse: 0 })
      })
    )
  })

  it("totalSoal rescale: changing totalSoal re-applies profile default composition scaled to new total", () => {
    renderGeneratePage()
    // Select SAS: profile {15,5,5} totalSoal=25
    fireEvent.click(screen.getByText("UAS"))
    // Expand panel to verify values
    fireEvent.click(screen.getByRole("button", { name: /atur komposisi/i }))
    // Verify initial SAS composition
    expect((screen.getByLabelText(/PG Pilihan Tunggal/i) as HTMLInputElement).value).toBe("15")
    // Change totalSoal to 50 → should rescale: 15/25*50=30, 5/25*50=10, trueFalse=50-30-10=10
    const totalSoalInput = screen.getByLabelText("Jumlah Soal")
    fireEvent.change(totalSoalInput, { target: { value: "50" } })
    expect((screen.getByLabelText(/PG Pilihan Tunggal/i) as HTMLInputElement).value).toBe("30")
    expect((screen.getByLabelText(/PG Pilihan Jamak/i) as HTMLInputElement).value).toBe("10")
    expect((screen.getByLabelText(/Benar\/Salah/i) as HTMLInputElement).value).toBe("10")
  })
})
