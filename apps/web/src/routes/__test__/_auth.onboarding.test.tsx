import type * as TanStackRouter from "@tanstack/react-router"
import { brandUserId, type UserProfile } from "@teacher-exam/shared"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import type { ComponentType } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as ApiModule from "../../lib/api.js"
import { Route } from "../_auth.onboarding.js"

const { mockGetSession, mockMeGet, mockMeUpdate, mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockMeGet: vi.fn(),
  mockMeUpdate: vi.fn(),
  mockGetSession: vi.fn()
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({ options: opts }),
    useNavigate: () => mockNavigate
  }
})

vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      me: {
        get: mockMeGet,
        update: mockMeUpdate
      }
    }
  }
})

vi.mock("../../lib/auth-client", () => ({
  authClient: {
    getSession: mockGetSession
  }
}))

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: brandUserId("user-1"),
    email: "sari@sekolah.test",
    name: "Sari Wulandari",
    username: "sari",
    image: null,
    school: null,
    gradesTaught: [5, 6],
    subjectsTaught: ["bahasa_indonesia"],
    profileCompleted: false,
    locale: "id-ID",
    timezone: "Asia/Jakarta",
    ...overrides
  }
}

function renderOnboarding() {
  const OnboardingPage = (Route as unknown as { options: { component: ComponentType } }).options.component
  return render(<OnboardingPage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  mockGetSession.mockResolvedValue({})
  mockMeGet.mockResolvedValue(Either.right(makeProfile()))
  mockMeUpdate.mockResolvedValue(Either.right(makeProfile({ profileCompleted: true })))
})

describe("OnboardingPage", () => {
  it("saves an empty school and opens generate", async () => {
    const user = userEvent.setup()
    renderOnboarding()

    const school = await screen.findByLabelText(/nama sekolah/i)
    expect(school).not.toBeRequired()
    expect(screen.getByText(/opsional/i)).toBeInTheDocument()
    expect(screen.getByText(/kop lembar/i)).toBeInTheDocument()

    await user.clear(school)
    await user.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/generate" })
    })
    const payload = mockMeUpdate.mock.calls[0]?.[0] as { school?: string }
    expect(payload.school).toBeUndefined()
    expect(screen.queryByText(/nama sekolah wajib/i)).not.toBeInTheDocument()
  })

  it("still opens generate when a school name is saved", async () => {
    const user = userEvent.setup()
    renderOnboarding()

    const school = await screen.findByLabelText(/nama sekolah/i)
    await user.type(school, "SD Nusantara")
    await user.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/generate" })
    })
    expect(mockMeUpdate.mock.calls[0]?.[0]).toMatchObject({ school: "SD Nusantara" })
  })

  it("does not block a username that contains a space", async () => {
    const user = userEvent.setup()
    renderOnboarding()

    const username = await screen.findByLabelText(/username/i)
    await user.clear(username)
    await user.type(username, "bu sari")
    await user.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/generate" })
    })
    const payload = mockMeUpdate.mock.calls[0]?.[0] as { username: string }
    expect(payload.username).toMatch(/^[a-z0-9._-]{3,32}$/)
    expect(screen.queryByText(/3-32 karakter/i)).not.toBeInTheDocument()
  })
})
