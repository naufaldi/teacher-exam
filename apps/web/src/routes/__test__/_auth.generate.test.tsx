import type * as TanStackRouter from "@tanstack/react-router"
import type { CurriculumCatalogResponse } from "@teacher-exam/shared"
import type * as UiModule from "@teacher-exam/ui"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mockApiFailOnce, mockApiResolvedValue, mockApiResolvedValueOnce } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"
import { api, ApiError } from "../../lib/api.js"
import { makeExamWithQuestions } from "../../test/fixtures/exam.js"
import { Route } from "../_auth.generate.js"

function syncGenerateResult(examId: string) {
  return { kind: "sync" as const, exam: makeExamWithQuestions(examId) }
}

const mockNavigate = vi.fn<(opts: unknown) => Promise<void>>()
let locationState: Record<string, unknown> | null = null

const PPKN_K1_BAB_TOPICS = [
  { bab: 1, title: "Aku dan Teman-Temanku", label: "Bab 1: Aku dan Teman-Temanku" },
  { bab: 2, title: "Aku Patuh pada Aturan", label: "Bab 2: Aku Patuh pada Aturan" },
  { bab: 3, title: "Aku Mengenal Indonesia", label: "Bab 3: Aku Mengenal Indonesia" },
  { bab: 4, title: "Aku dan Lingkunganku", label: "Bab 4: Aku dan Lingkunganku" }
] as const

const BI_K1_BAB_TOPICS = [
  { bab: 1, title: "Bunyi Apa?", label: "Bab 1: Bunyi Apa?" }
] as const

const PPKN_K5_BAB_TOPICS = [
  { bab: 1, title: "Pancasila", label: "Bab 1: Pancasila" }
] as const

const PPKN_K4_BAB_TOPICS = [
  { bab: 1, title: "Nilai-Nilai Pancasila", label: "Bab 1: Nilai-Nilai Pancasila" }
] as const

const PPKN_K6_BAB_TOPICS = [
  { bab: 1, title: "Pancasila dalam Kehidupan", label: "Bab 1: Pancasila dalam Kehidupan" }
] as const

const MATEMATIKA_K1_BAB_TOPICS = [
  { bab: 1, title: "Bilangan", label: "Bab 1: Bilangan" }
] as const

const MATEMATIKA_K5_BAB_TOPICS = [
  { bab: 1, title: "Bilangan Cacah Sampai 100.000", label: "Bab 1: Bilangan Cacah Sampai 100.000" },
  { bab: 2, title: "Pecahan", label: "Bab 2: Pecahan" }
] as const

const READY_CURRICULUM_CATALOG: CurriculumCatalogResponse = [
  {
    key: "bahasa_indonesia",
    label: "Bahasa Indonesia",
    family: "bahasa",
    optional: false,
    grades: [
      { grade: 1, phase: "A", availability: "ready" },
      { grade: 2, phase: "A", availability: "ready" },
      { grade: 3, phase: "B", availability: "ready" },
      { grade: 4, phase: "B", availability: "missing" },
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
      { grade: 1, phase: "A", availability: "ready" },
      { grade: 2, phase: "A", availability: "ready" },
      { grade: 3, phase: "B", availability: "missing" },
      { grade: 4, phase: "B", availability: "ready" },
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
      { grade: 1, phase: "A", availability: "disabled" },
      { grade: 2, phase: "A", availability: "disabled" },
      { grade: 3, phase: "B", availability: "ready" },
      { grade: 4, phase: "B", availability: "ready" },
      { grade: 5, phase: "C", availability: "ready" },
      { grade: 6, phase: "C", availability: "ready" }
    ]
  },
  {
    key: "bahasa_inggris",
    label: "Bahasa Inggris",
    family: "bahasa",
    optional: true,
    grades: [
      { grade: 1, phase: "A", availability: "missing" },
      { grade: 2, phase: "A", availability: "missing" },
      { grade: 3, phase: "B", availability: "ready" },
      { grade: 4, phase: "B", availability: "ready" },
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
      { grade: 1, phase: "A", availability: "ready" },
      { grade: 2, phase: "A", availability: "ready" },
      { grade: 3, phase: "B", availability: "ready" },
      { grade: 4, phase: "B", availability: "ready" },
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
    useSearch: () => ({ simulate: undefined }),
    useLocation: () => ({ state: locationState })
  }
})

vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      ai: { generate: vi.fn() },
      exams: { pollGenerateStream: vi.fn() },
      curriculum: { catalog: vi.fn(), babTopics: vi.fn() },
      pdfUploads: { create: vi.fn(), list: vi.fn(), get: vi.fn(), remove: vi.fn() }
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
      { children, disabled, onClick, type, ...rest }: {
        disabled?: boolean
        onClick?: () => void
        children: React.ReactNode
        type?: "button" | "submit" | "reset"
        "aria-label"?: string
      }
    ) => (
      <button type={type ?? "button"} disabled={disabled} onClick={onClick} {...rest}>
        {children}
      </button>
    ),
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
    SelectItem: (
      { children, disabled, value }: { children: React.ReactNode; value: string; disabled?: boolean }
    ) => (
      <SelectContext.Consumer>
        {(onSelect) => (
          <button
            type="button"
            data-value={value}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onSelect(value)
            }}
          >
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
  curriculum: { catalog: ReturnType<typeof vi.fn>; babTopics: ReturnType<typeof vi.fn> }
  pdfUploads: {
    create: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }
}

const READY_LIBRARY_PDF = {
  id: "pdf_test_1",
  status: "ready" as const,
  filename: "sample-worksheet.pdf",
  fileSize: 12_345,
  createdAt: "2026-06-30T00:00:00.000Z",
  readyAt: "2026-06-30T00:00:01.000Z"
}

async function selectPdfGuruKelas5() {
  mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
  renderGeneratePage()
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
  })
  fireEvent.click(screen.getByText("PDF saya saja"))
  fireEvent.click(screen.getByText("Kelas 5 SD"))
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
  })
}

async function fillMinimalDefaultFormForGenerate() {
  mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
  mockApiResolvedValue(mockApi.curriculum.babTopics, [...BI_K1_BAB_TOPICS])
  renderGeneratePage()
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
  })
  fireEvent.click(screen.getByText("Kelas 1 SD"))
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
  })
  fireEvent.click(screen.getByRole("button", { name: "Bahasa Indonesia" }))
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
  })
  fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))
  fireEvent.click(screen.getByText("Bab 1: Bunyi Apa?"))
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
  locationState = null
  mockApi.ai.generate.mockReset()
  mockApi.curriculum.catalog.mockReturnValue(new Promise(() => {}))
  mockApi.curriculum.babTopics.mockReturnValue(new Promise(() => {}))
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

describe("Template prefill", () => {
  it("prefills subject, grade, topics, and totalSoal from router state", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValue(mockApi.curriculum.babTopics, [...BI_K1_BAB_TOPICS])
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_tpl"))
    locationState = {
      templateApply: {
        subject: "bahasa_indonesia",
        grade: 1,
        difficulty: "sedang",
        topics: ["Bab 1: Bunyi Apa?"],
        reviewMode: "fast",
        examType: "latihan",
        totalSoal: 15,
        composition: { mcqSingle: 15, mcqMulti: 0, trueFalse: 0 },
        templateId: "tpl-1"
      }
    }
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(screen.getByRole("button", { name: /generate lembar/i })).not.toBeDisabled()
    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "bahasa_indonesia",
        grade: 1,
        topics: ["Bab 1: Bunyi Apa?"],
        totalSoal: 15,
        examType: "latihan",
        difficulty: "sedang"
      })
    )
  })
})

describe("Jumlah Soal input", () => {
  it("shows Kelas 1-6 in the grade selector", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(screen.getByText("Kelas 1 SD")).toBeInTheDocument()
    expect(screen.getByText("Kelas 2 SD")).toBeInTheDocument()
    expect(screen.getByText("Kelas 3 SD")).toBeInTheDocument()
    expect(screen.getByText("Kelas 4 SD")).toBeInTheDocument()
    expect(screen.getByText("Kelas 5 SD")).toBeInTheDocument()
    expect(screen.getByText("Kelas 6 SD")).toBeInTheDocument()
  })

  it("shows ready and unavailable subjects after choosing Kelas 1", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 1 SD"))

    expect(screen.getByRole("button", { name: "Bahasa Indonesia" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pendidikan Pancasila" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Matematika" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "IPAS — Tidak tersedia" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Bahasa Inggris — Belum tersedia (Opsional)" })).toBeDisabled()
  })

  it("submits Bahasa Indonesia Kelas 1 with a selected Bab topic", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.curriculum.babTopics, [...BI_K1_BAB_TOPICS])
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_k1"))
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 1 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))
    fireEvent.click(screen.getByText("Bab 1: Bunyi Apa?"))

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "bahasa_indonesia",
        grade: 1,
        topics: ["Bab 1: Bunyi Apa?"]
      })
    )
  })

  it("updates curriculum phase copy after choosing Kelas 1", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 1 SD"))

    expect(screen.getByText("Fase A (Kelas 1–2)")).toBeInTheDocument()
    expect(screen.queryByText("Fase C (Kelas 5–6)")).not.toBeInTheDocument()
  })

  it("offers IPAS and Bahasa Inggris in the subject selector", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("Kelas 5 SD"))

    expect(screen.getByText("IPAS")).toBeInTheDocument()
    expect(screen.getByText("Bahasa Inggris (Opsional)")).toBeInTheDocument()
  })

  it("shows ready and stubbed subjects after choosing Kelas 5", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 5 SD"))

    expect(screen.getByRole("button", { name: "Bahasa Indonesia" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pendidikan Pancasila" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "IPAS" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bahasa Inggris (Opsional)" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Matematika — Sedang dipersiapkan" })).toBeDisabled()
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
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_abc"))

    await fillMinimalDefaultFormForGenerate()

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
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_abc"))

    await fillMinimalDefaultFormForGenerate()
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
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_abc"))

    await fillMinimalDefaultFormForGenerate()

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

    await fillMinimalDefaultFormForGenerate()
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

    await fillMinimalDefaultFormForGenerate()
    await clickGenerateAndFlush()

    expect(screen.getByRole("dialog")).toHaveTextContent("Expected 40 questions, got 20")
  })

  it("uses the dynamic examId from api response, not a fixed value", async () => {
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_from_server_42"))

    await fillMinimalDefaultFormForGenerate()
    await clickGenerateAndFlush()

    const call = mockNavigate.mock.calls[0]?.[0] as Record<string, unknown>
    const search = call?.["search"] as Record<string, unknown>
    expect(search?.["examId"]).toBe("exam_from_server_42")
  })
})

describe("GeneratePage — Bab materi picker", () => {
  it("loads Bab options for PPKN Kelas 1 from the API", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.curriculum.babTopics, [...PPKN_K1_BAB_TOPICS])
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 1 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("button", { name: "Pendidikan Pancasila" }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))

    expect(screen.getByText("Bab 1: Aku dan Teman-Temanku")).toBeInTheDocument()
    expect(screen.getByText("Bab 4: Aku dan Lingkunganku")).toBeInTheDocument()
    expect(screen.queryByText("Materi sesuai Buku Siswa")).not.toBeInTheDocument()
  })

  it("shows Bab titles from the API in TopicMultiSelect", async () => {
    const { render: rtlRender } = await import("@testing-library/react")
    const { TopicMultiSelect } = await import("../../components/generate/topic-multi-select.js")

    rtlRender(
      <TopicMultiSelect
        options={MATEMATIKA_K5_BAB_TOPICS.map((topic) => topic.label)}
        selected={[]}
        onChange={() => {}}
      />
    )
    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))

    expect(screen.getByText("Bab 1: Bilangan Cacah Sampai 100.000")).toBeInTheDocument()
    expect(screen.getByText("Bab 2: Pecahan")).toBeInTheDocument()
  })
})

describe("GeneratePage — subject availability (#171)", () => {
  it("does not switch to a stubbed subject when its disabled option is clicked", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.curriculum.babTopics, [...PPKN_K5_BAB_TOPICS])
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_k5"))
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 5 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("button", { name: "Pendidikan Pancasila" }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("button", { name: "Matematika — Sedang dipersiapkan" }))
    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))
    fireEvent.click(screen.getByText("Bab 1: Pancasila"))

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "pendidikan_pancasila",
        grade: 5,
        topics: ["Bab 1: Pancasila"]
      })
    )
  })
})

describe("GeneratePage — grade change reset (#169)", () => {
  it("clears topics when switching from Kelas 6 to Kelas 1 while keeping a valid subject", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.curriculum.babTopics, [...PPKN_K6_BAB_TOPICS])
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 6 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("button", { name: "Pendidikan Pancasila" }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))
    fireEvent.click(screen.getByText("Bab 1: Pancasila dalam Kehidupan"))

    fireEvent.click(screen.getByText("Kelas 1 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(screen.queryByLabelText("Hapus topik: Bab 1: Pancasila dalam Kehidupan")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pendidikan Pancasila" })).toBeInTheDocument()
  })

  it("clears topics when switching from Kelas 1 to Kelas 4", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.curriculum.babTopics, [...MATEMATIKA_K1_BAB_TOPICS])
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 1 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("button", { name: "Matematika" }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))
    fireEvent.click(screen.getByText("Bab 1: Bilangan"))

    fireEvent.click(screen.getByText("Kelas 4 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(screen.queryByLabelText("Hapus topik: Bab 1: Bilangan")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "IPAS" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bahasa Inggris (Opsional)" })).toBeInTheDocument()
  })
})

describe("GeneratePage — Kelas 4 and Kelas 6 coverage (#172)", () => {
  it("shows Fase B copy and ready Kelas 4 subjects", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 4 SD"))

    expect(screen.getByText("Fase B (Kelas 3–4)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pendidikan Pancasila" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "IPAS" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bahasa Inggris (Opsional)" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bahasa Indonesia — Belum tersedia" })).toBeDisabled()
  })

  it("shows Fase C copy and stubbed Matematika on Kelas 6", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 6 SD"))

    expect(screen.getByText("Fase C (Kelas 5–6)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Matematika — Sedang dipersiapkan" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Pendidikan Pancasila" })).toBeInTheDocument()
  })

  it("submits a Kelas 4 generate request with a ready subject", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.curriculum.babTopics, [...PPKN_K4_BAB_TOPICS])
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_k4"))
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByText("Kelas 4 SD"))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("button", { name: "Pendidikan Pancasila" }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    fireEvent.click(screen.getByRole("combobox", { name: /pilih topik/i }))
    fireEvent.click(screen.getByText("Bab 1: Nilai-Nilai Pancasila"))

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "pendidikan_pancasila",
        grade: 4,
        topics: ["Bab 1: Nilai-Nilai Pancasila"]
      })
    )
  })
})

describe("GeneratePage — grade-aware materi", () => {
  it("prompts to pick kelas before materi options are available", () => {
    renderGeneratePage()
    expect(screen.getByText("Pilih kelas dulu untuk melihat materi Bab.")).toBeInTheDocument()
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
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam_abc"))

    await fillMinimalDefaultFormForGenerate()
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

  it("shows source mode selector with Buku Siswa default and hides PDF upload", () => {
    renderGeneratePage()
    expect(screen.getAllByText("Buku Siswa").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("PDF saya saja")).toBeInTheDocument()
    expect(screen.queryByText(/Drag.*drop/i)).not.toBeInTheDocument()
  })

  it("shows kurikulum warning and free topic in pdf_guru mode", () => {
    renderGeneratePage()
    fireEvent.click(screen.getByText("PDF saya saja"))
    expect(screen.getByText(/Periksa kurikulum/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Topik bebas/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Seni Budaya/i)).toBeInTheDocument()
    expect(screen.queryByText(/Pilih 1–8 materi Bab/i)).not.toBeInTheDocument()
  })

  it("pdf_guru uses free-text mapel without catalog-ready enum gate", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, [])
    mockApiResolvedValue(mockApi.pdfUploads.list, { items: [READY_LIBRARY_PDF] })
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.click(screen.getByText("Kelas 5 SD"))
    fireEvent.change(screen.getByPlaceholderText(/Seni Budaya/i), {
      target: { value: "PJOK" }
    })
    fireEvent.click(screen.getByRole("button", { name: /Dari perpustakaan/i }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("sample-worksheet.pdf"))
    fireEvent.change(screen.getByLabelText(/Topik bebas/i), {
      target: { value: "Gerak dasar dan permainan bola kecil" }
    })
    const generateButton = screen.getByRole("button", { name: /generate lembar/i })
    expect(generateButton).not.toBeDisabled()
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam-pdf-1"))
    fireEvent.click(generateButton)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceMode: "pdf_guru",
        subjectLabel: "PJOK",
        freeTopic: "Gerak dasar dan permainan bola kecil"
      })
    )
    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.not.objectContaining({ subject: expect.anything() })
    )
  })

  it("clears pdf_guru fields when switching back to default", () => {
    renderGeneratePage()
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.change(screen.getByLabelText(/Topik bebas/i), {
      target: { value: "Ekosistem lingkungan sekolah" }
    })
    fireEvent.click(screen.getByText("Buku Siswa"))
    expect(screen.queryByLabelText(/Topik bebas/i)).not.toBeInTheDocument()
  })

  it("disables Generate until new upload reaches ready (#233)", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValueOnce(mockApi.pdfUploads.create, {
      id: "pdf_upload_wait",
      status: "processing",
      filename: "modul.pdf",
      createdAt: "2026-07-09T00:00:00.000Z"
    })
    mockApiResolvedValue(mockApi.pdfUploads.get, {
      id: "pdf_upload_wait",
      status: "processing",
      filename: "modul.pdf",
      createdAt: "2026-07-09T00:00:00.000Z"
    })
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.click(screen.getByText("Kelas 5 SD"))
    fireEvent.change(screen.getByPlaceholderText(/Seni Budaya/i), {
      target: { value: "IPAS" }
    })
    fireEvent.change(screen.getByLabelText(/Topik bebas/i), {
      target: { value: "Ekosistem lingkungan sekolah yang bagus" }
    })
    const file = new File(["%PDF-1.4"], "modul.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByLabelText(/Pilih file PDF/i), {
      target: { files: [file] }
    })
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(mockApi.pdfUploads.create).toHaveBeenCalled()
    expect(screen.getByText(/Sedang memproses PDF/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /generate lembar/i })).toBeDisabled()

    mockApiResolvedValue(mockApi.pdfUploads.get, {
      id: "pdf_upload_wait",
      status: "ready",
      filename: "modul.pdf",
      createdAt: "2026-07-09T00:00:00.000Z",
      readyAt: "2026-07-09T00:00:02.000Z"
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(screen.getByText(/PDF siap digunakan/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /generate lembar/i })).not.toBeDisabled()
  })

  it("pdf_guru footer does not claim Capaian Pembelajaran (#233)", async () => {
    await selectPdfGuruKelas5()
    expect(screen.getByRole("button", { name: /generate lembar/i }).closest("div")?.textContent)
      .not.toMatch(/Capaian Pembelajaran/i)
    expect(screen.getByText(/berdasarkan PDF yang dipilih/i)).toBeInTheDocument()
  })

  it("softens includePdfImages promise and does not send the flag (#233)", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValue(mockApi.pdfUploads.list, { items: [READY_LIBRARY_PDF] })
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.click(screen.getByText("Kelas 5 SD"))
    fireEvent.change(screen.getByPlaceholderText(/Seni Budaya/i), {
      target: { value: "IPAS" }
    })
    fireEvent.click(screen.getByRole("button", { name: /Dari perpustakaan/i }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("sample-worksheet.pdf"))
    fireEvent.change(screen.getByLabelText(/Topik bebas/i), {
      target: { value: "Ekosistem lingkungan sekolah yang bagus" }
    })
    expect(screen.queryByText(/maks\.\s*~30%/i)).not.toBeInTheDocument()
    const imageToggle = screen.getByRole("checkbox", { name: /Sertakan gambar dari PDF/i })
    expect(imageToggle).toBeDisabled()
    expect(screen.getByText(/segera hadir/i)).toBeInTheDocument()
    mockApiResolvedValueOnce(mockApi.ai.generate, syncGenerateResult("exam-pdf-img"))
    fireEvent.click(screen.getByRole("button", { name: /generate lembar/i }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.not.objectContaining({ includePdfImages: true })
    )
  })
})

describe("M7 UX polish (#215)", () => {
  it("disables Generate when pdf_guru has no ready PDF (#233)", async () => {
    await selectPdfGuruKelas5()
    fireEvent.change(screen.getByPlaceholderText(/Seni Budaya/i), {
      target: { value: "IPAS" }
    })
    fireEvent.change(screen.getByLabelText(/Topik bebas/i), {
      target: { value: "Ekosistem lingkungan sekolah yang bagus" }
    })
    expect(screen.getByRole("button", { name: /generate lembar/i })).toBeDisabled()
    expect(mockApi.ai.generate).not.toHaveBeenCalled()
  })

  it("shows inline topik error (EC-A2) when pdf_guru free topic is too short", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValue(mockApi.pdfUploads.list, { items: [READY_LIBRARY_PDF] })
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.click(screen.getByText("Kelas 5 SD"))
    fireEvent.change(screen.getByPlaceholderText(/Seni Budaya/i), {
      target: { value: "IPAS" }
    })
    fireEvent.click(screen.getByRole("button", { name: /Dari perpustakaan/i }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("sample-worksheet.pdf"))
    fireEvent.change(screen.getByLabelText(/Topik bebas/i), { target: { value: "pendek" } })
    fireEvent.click(screen.getByRole("button", { name: /generate lembar/i }))
    expect(screen.getByText(/Topik bebas wajib diisi/i)).toBeInTheDocument()
    expect(mockApi.ai.generate).not.toHaveBeenCalled()
  })

  it("shows library PDF filename in sidebar summary", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValue(mockApi.pdfUploads.list, { items: [READY_LIBRARY_PDF] })
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.click(screen.getByText("Kelas 5 SD"))
    fireEvent.click(screen.getByRole("button", { name: /Dari perpustakaan/i }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("sample-worksheet.pdf"))
    const sidebar = screen.getByTestId("generate-sidebar-summary")
    expect(within(sidebar).getByText("sample-worksheet.pdf")).toBeInTheDocument()
    expect(within(sidebar).getByText("PDF saya saja")).toBeInTheDocument()
  })

  it("confirms before deleting a library PDF", async () => {
    mockApiResolvedValueOnce(mockApi.curriculum.catalog, READY_CURRICULUM_CATALOG)
    mockApiResolvedValue(mockApi.pdfUploads.list, { items: [READY_LIBRARY_PDF] })
    mockApiResolvedValueOnce(mockApi.pdfUploads.remove, undefined)
    renderGeneratePage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    fireEvent.click(screen.getByText("PDF saya saja"))
    fireEvent.click(screen.getByRole("button", { name: /Dari perpustakaan/i }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(screen.getByText("sample-worksheet.pdf")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Hapus sample-worksheet.pdf"))
    expect(screen.getByText(/Hapus PDF dari perpustakaan/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Batal/i }))
    expect(mockApi.pdfUploads.remove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText("Hapus sample-worksheet.pdf"))
    fireEvent.click(screen.getByRole("button", { name: /^Hapus$/i }))
    expect(mockApi.pdfUploads.remove).toHaveBeenCalledWith("pdf_test_1")
  })
})
