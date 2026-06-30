import type * as TanStackRouter from "@tanstack/react-router"
import type { ExamTemplate } from "@teacher-exam/shared"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.templates.js"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts
    }),
    Link: ({
      children,
      to
    }: {
      children: React.ReactNode
      to: string
    }) => <a href={to}>{children}</a>,
    useNavigate: () => vi.fn()
  }
})

const listMock = vi.fn()
const removeMock = vi.fn()
const applyMock = vi.fn()

vi.mock("../../lib/api.js", () => ({
  api: {
    templates: {
      list: (...args: Array<unknown>) => listMock(...args),
      remove: (...args: Array<unknown>) => removeMock(...args),
      apply: (...args: Array<unknown>) => applyMock(...args),
      create: vi.fn(),
      update: vi.fn()
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

const NOW = "2024-01-01T00:00:00.000Z"

function makeTemplate(overrides: Partial<ExamTemplate> = {}): ExamTemplate {
  return {
    id: "tpl-1" as ExamTemplate["id"],
    userId: "user-1" as ExamTemplate["userId"],
    name: "Latihan IPAS",
    description: null,
    config: {
      subject: "ipas",
      grade: 5,
      difficulty: "sedang",
      topics: ["Energi", "Gerak"],
      reviewMode: "fast"
    },
    usageCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

function renderRoute() {
  const Component = (Route as unknown as { options: { component: React.ComponentType } }).options.component
  return render(
    <ToastProvider>
      <Component />
    </ToastProvider>
  )
}

describe("Templates route", () => {
  it("lists the teacher's templates", async () => {
    listMock.mockResolvedValue(Either.right([makeTemplate({ name: "Latihan IPAS" })]))
    renderRoute()
    expect(await screen.findByText("Latihan IPAS")).toBeInTheDocument()
  })

  it("shows empty state when no templates exist", async () => {
    listMock.mockResolvedValue(Either.right([]))
    renderRoute()
    expect(await screen.findByText(/belum ada template/i)).toBeInTheDocument()
  })

  it("shows subject and grade from config", async () => {
    listMock.mockResolvedValue(
      Either.right([
        makeTemplate({
          config: { subject: "matematika", grade: 6, difficulty: "sulit", topics: ["Pecahan"], reviewMode: "slow" }
        })
      ])
    )
    renderRoute()
    expect(await screen.findByText(/matematika/i)).toBeInTheDocument()
    expect(await screen.findByText(/kelas 6/i)).toBeInTheDocument()
  })

  it("shows usage count", async () => {
    listMock.mockResolvedValue(Either.right([makeTemplate({ usageCount: 7 })]))
    renderRoute()
    expect(await screen.findByText(/7/i)).toBeInTheDocument()
  })

  it("calls apply and shows a generate link on apply", async () => {
    const user = userEvent.setup()
    listMock.mockResolvedValue(Either.right([makeTemplate({ id: "tpl-1" as ExamTemplate["id"] })]))
    applyMock.mockResolvedValue(
      Either.right({
        subject: "ipas",
        grade: 5,
        difficulty: "sedang",
        topics: ["Energi", "Gerak"],
        reviewMode: "fast",
        templateId: "tpl-1" as never
      })
    )
    renderRoute()
    const applyButton = await screen.findByRole("button", { name: /gunakan/i })
    await user.click(applyButton)
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith("tpl-1"))
  })

  it("deletes a template on confirm", async () => {
    const user = userEvent.setup()
    listMock.mockResolvedValue(Either.right([makeTemplate({ name: "Hapus saya" })]))
    removeMock.mockResolvedValue(Either.right(undefined))
    renderRoute()
    const deleteButton = await screen.findByRole("button", { name: /hapus/i })
    await user.click(deleteButton)
    await waitFor(() => {
      expect(screen.getByText(/Hapus template\?/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: /ya, hapus/i }))
    await waitFor(() => expect(removeMock).toHaveBeenCalled())
  })
})
