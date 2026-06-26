import type * as TanStackRouter from "@tanstack/react-router"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../ujian.$code.js"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  const routeObj = {
    options: {} as Record<string, unknown>,
    useParams: () => ({ code: "ABC123" }),
    useLoaderData: () => ({}),
    useSearch: () => ({})
  }
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => {
      routeObj.options = opts
      return routeObj
    },
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

const getMock = vi.fn()
const startMock = vi.fn()
const submitMock = vi.fn()

vi.mock("../../lib/api.js", () => ({
  api: {
    sessions: {
      public: {
        get: (...args: Array<unknown>) => getMock(...args),
        start: (...args: Array<unknown>) => startMock(...args),
        submit: (...args: Array<unknown>) => submitMock(...args)
      }
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

const OPEN = "2099-01-01T08:00:00.000Z"
const CLOSE = "2099-01-01T10:00:00.000Z"

function makeDetail(overrides: Record<string, unknown> = {}) {
  return {
    sessionCode: "ABC123",
    title: "Latihan IPAS",
    subject: "ipas",
    grade: 5,
    durationMinutes: 60,
    opensAt: OPEN,
    closesAt: CLOSE,
    status: "open",
    questions: [
      {
        id: "q-1",
        number: 1,
        _tag: "mcq_single",
        text: "Berapa 2 + 2?",
        options: { a: "3", b: "4", c: "5", d: "6" }
      }
    ],
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

describe("Ujian take-exam route", () => {
  it("renders the exam title and start form (questions gated until start)", async () => {
    getMock.mockResolvedValue(Either.right(makeDetail()))
    renderRoute()
    expect(await screen.findByText("Latihan IPAS")).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /mulai/i })).toBeInTheDocument()
  })

  it("starts the session and enrolls the student", async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(Either.right(makeDetail()))
    startMock.mockResolvedValue(
      Either.right({
        id: "ss-1",
        sessionId: "ses-1",
        studentId: null,
        studentName: "Budi",
        identifier: null,
        token: "tok-1",
        joinedAt: OPEN,
        submittedAt: null
      })
    )

    renderRoute()
    const nameInput = await screen.findByLabelText(/nama/i)
    await user.type(nameInput, "Budi")
    await user.click(screen.getByRole("button", { name: /^mulai$/i }))

    await waitFor(() => expect(startMock).toHaveBeenCalled())
  })

  it("submits answers after enrolling", async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(Either.right(makeDetail()))
    startMock.mockResolvedValue(
      Either.right({
        id: "ss-1",
        sessionId: "ses-1",
        studentId: null,
        studentName: "Budi",
        identifier: null,
        token: "tok-1",
        joinedAt: OPEN,
        submittedAt: null
      })
    )
    submitMock.mockResolvedValue(Either.right({ ok: true }))

    renderRoute()
    await user.type(await screen.findByLabelText(/nama/i), "Budi")
    await user.click(screen.getByRole("button", { name: /^mulai$/i }))
    await waitFor(() => expect(startMock).toHaveBeenCalled())

    const radios = await screen.findAllByRole("radio")
    const firstRadio = radios[0]
    if (!firstRadio) throw new Error("no radio rendered")
    await user.click(firstRadio)
    await user.click(screen.getByRole("button", { name: /kumpulkan/i }))

    await waitFor(() => expect(submitMock).toHaveBeenCalled())
  })

  it("shows expired notice when window is closed", async () => {
    getMock.mockResolvedValue(
      Either.right(
        makeDetail({
          status: "closed",
          opensAt: "2020-01-01T08:00:00.000Z",
          closesAt: "2020-01-01T10:00:00.000Z"
        })
      )
    )
    renderRoute()
    expect(await screen.findByRole("heading", { name: /berakhir/i })).toBeInTheDocument()
  })
})
