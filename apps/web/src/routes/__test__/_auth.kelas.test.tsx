import type * as TanStackRouter from "@tanstack/react-router"
import type { ClassEntity } from "@teacher-exam/shared"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockApiResolvedValueOnce } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"

import { Route } from "../_auth.kelas.js"

const { apiMocks } = vi.hoisted(() => ({
  apiMocks: {
    classesList: vi.fn(),
    classesCreate: vi.fn(),
    classesUpdate: vi.fn(),
    classesRemove: vi.fn(),
    studentsList: vi.fn(),
    studentsBulkCreate: vi.fn(),
    studentsRemove: vi.fn()
  }
}))

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

vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      classes: {
        list: apiMocks.classesList,
        create: apiMocks.classesCreate,
        update: apiMocks.classesUpdate,
        remove: apiMocks.classesRemove,
        students: {
          list: apiMocks.studentsList,
          bulkCreate: apiMocks.studentsBulkCreate,
          remove: apiMocks.studentsRemove
        }
      }
    }
  }
})

const baseClass: ClassEntity = {
  id: "cls-1" as ClassEntity["id"],
  userId: "user-1" as ClassEntity["userId"],
  name: "Kelas 5A",
  grade: 5 as ClassEntity["grade"],
  subject: "matematika",
  schoolName: "SDN Jakarta",
  academicYear: "2025/2026",
  defaultExamType: "formatif",
  defaultExamDate: "2026-05-14",
  defaultDurationMinutes: 60,
  defaultInstructions: "Kerjakan dengan teliti.",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
}

function renderRoute() {
  const Component = (Route as unknown as { options: { component: React.ComponentType } }).options.component
  return render(
    <ToastProvider>
      <Component />
    </ToastProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Kelas route", () => {
  it("shows the real class template page instead of coming soon", async () => {
    mockApiResolvedValueOnce(apiMocks.classesList, [])

    renderRoute()

    expect(await screen.findByRole("heading", { level: 1, name: "Kelas" })).toBeInTheDocument()
    expect(screen.getByLabelText(/nama kelas/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nama sekolah/i)).toBeInTheDocument()
    expect(screen.queryByText(/segera hadir/i)).not.toBeInTheDocument()
  })

  it("only shows class identity fields for the class template", async () => {
    mockApiResolvedValueOnce(apiMocks.classesList, [])

    renderRoute()

    expect(await screen.findByLabelText(/nama kelas/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nama sekolah/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tahun pelajaran/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/jenis ujian/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/durasi default/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/tanggal ujian default/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/petunjuk default/i)).not.toBeInTheDocument()
  })

  it("creates a class with class identity fields only", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [])
    mockApiResolvedValueOnce(apiMocks.classesCreate, baseClass)

    renderRoute()

    await user.type(await screen.findByLabelText(/nama kelas/i), "Kelas 5A")
    await user.type(screen.getByLabelText(/nama sekolah/i), "SDN Jakarta")
    await user.type(screen.getByLabelText(/tahun pelajaran/i), "2025/2026")
    await user.click(screen.getByRole("button", { name: /tambah kelas/i }))

    await waitFor(() => {
      expect(apiMocks.classesCreate).toHaveBeenCalledWith({
        name: "Kelas 5A",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        defaultExamType: "formatif"
      })
    })
  })

  it("updates class identity fields and keeps student management on selected class detail", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [baseClass])
    mockApiResolvedValueOnce(apiMocks.studentsList, [])
    mockApiResolvedValueOnce(apiMocks.classesUpdate, {
      ...baseClass,
      schoolName: "SDN Baru"
    })

    renderRoute()

    await user.click(await screen.findByText("Kelas 5A"))
    const schoolInput = await screen.findByLabelText(/nama sekolah template/i)
    await user.clear(schoolInput)
    await user.type(schoolInput, "SDN Baru")
    expect(screen.getByLabelText(/impor siswa/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/petunjuk default template/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /simpan template/i }))

    await waitFor(() => {
      expect(apiMocks.classesUpdate).toHaveBeenCalledWith(
        "cls-1",
        {
          name: "Kelas 5A",
          schoolName: "SDN Baru",
          academicYear: "2025/2026",
          defaultExamType: "formatif"
        }
      )
    })
  })
})
