import type * as TanStackRouter from "@tanstack/react-router"
import type { ClassEntity } from "@teacher-exam/shared"
import { ToastProvider } from "@teacher-exam/ui"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  semester: "ganjil",
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
  Element.prototype.scrollIntoView = vi.fn()
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

  it("shows full sheet default fields for the class template", async () => {
    mockApiResolvedValueOnce(apiMocks.classesList, [])

    renderRoute()

    expect(await screen.findByLabelText(/nama kelas/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nama sekolah/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tahun pelajaran/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/semester/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/jenis ujian/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/durasi default/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/petunjuk default/i)).toBeInTheDocument()
  })

  it("creates a class with full sheet default fields", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [])
    mockApiResolvedValueOnce(apiMocks.classesCreate, baseClass)

    renderRoute()

    await user.type(await screen.findByLabelText(/nama kelas/i), "Kelas 5A")
    await user.type(screen.getByLabelText(/nama sekolah/i), "SDN Jakarta")
    await user.type(screen.getByLabelText(/tahun pelajaran/i), "2025/2026")
    fireEvent.click(screen.getByRole("combobox", { name: /^semester$/i }))
    fireEvent.click(screen.getByRole("option", { name: /^ganjil$/i }))
    await user.type(screen.getByLabelText(/durasi default/i), "60")
    await user.type(screen.getByLabelText(/petunjuk default/i), "Kerjakan dengan teliti.")
    await user.click(screen.getByRole("button", { name: /tambah kelas/i }))

    await waitFor(() => {
      expect(apiMocks.classesCreate).toHaveBeenCalledWith({
        name: "Kelas 5A",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        semester: "ganjil",
        defaultExamType: "formatif",
        defaultDurationMinutes: 60,
        defaultInstructions: "Kerjakan dengan teliti."
      })
    })
    expect(await screen.findByText(/kelas ditambahkan/i)).toBeInTheDocument()
  })

  it("shows inline errors and toast when create is submitted empty", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [])

    renderRoute()

    await user.click(await screen.findByRole("button", { name: /tambah kelas/i }))

    expect(apiMocks.classesCreate).not.toHaveBeenCalled()
    expect(await screen.findByText(/lengkapi template kelas/i)).toBeInTheDocument()
    expect(screen.getAllByText(/wajib diisi/i).length).toBeGreaterThan(0)
  })

  it("shows tahun pelajaran format error on create", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [])

    renderRoute()

    await user.type(await screen.findByLabelText(/nama kelas/i), "Kelas 5A")
    await user.type(screen.getByLabelText(/nama sekolah/i), "SDN Jakarta")
    await user.type(screen.getByLabelText(/tahun pelajaran/i), "2025/2027")
    await user.click(screen.getByRole("button", { name: /tambah kelas/i }))

    expect(apiMocks.classesCreate).not.toHaveBeenCalled()
    expect(await screen.findByText(/tahun pelajaran harus berurutan/i)).toBeInTheDocument()
  })

  it("shows incomplete banner for legacy class missing school or year", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [{
      ...baseClass,
      schoolName: null,
      academicYear: null
    }])

    renderRoute()

    await user.click(await screen.findByText("Kelas 5A"))
    expect(
      await screen.findByText(/lengkapi template sebelum dipakai di review/i)
    ).toBeInTheDocument()
  })

  it("does not show incomplete banner for complete class", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [baseClass])

    renderRoute()

    await user.click(await screen.findByText("Kelas 5A"))
    expect(await screen.findByLabelText(/nama sekolah template/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/lengkapi template sebelum dipakai di review/i)
    ).not.toBeInTheDocument()
  })

  it("blocks save template when edit form is incomplete", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [{
      ...baseClass,
      schoolName: null,
      academicYear: null
    }])

    renderRoute()

    await user.click(await screen.findByText("Kelas 5A"))
    await user.click(await screen.findByRole("button", { name: /simpan template/i }))

    expect(apiMocks.classesUpdate).not.toHaveBeenCalled()
    expect(await screen.findByText(/lengkapi template kelas/i)).toBeInTheDocument()
  })

  it("shows semester in the class list", async () => {
    mockApiResolvedValueOnce(apiMocks.classesList, [baseClass])

    renderRoute()

    expect(await screen.findByText("Kelas 5A")).toBeInTheDocument()
    expect(
      screen.getByText((content, element) =>
        element?.tagName === "P" &&
        /SDN Jakarta/i.test(content) &&
        /Ganjil/i.test(element.textContent ?? "")
      )
    ).toBeInTheDocument()
  })

  it("updates full sheet default fields on selected class detail", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [baseClass])
    mockApiResolvedValueOnce(apiMocks.classesUpdate, {
      ...baseClass,
      schoolName: "SDN Baru",
      semester: "genap"
    })

    renderRoute()

    await user.click(await screen.findByText("Kelas 5A"))
    const schoolInput = await screen.findByLabelText(/nama sekolah template/i)
    await user.clear(schoolInput)
    await user.type(schoolInput, "SDN Baru")
    expect(screen.getByLabelText(/durasi default template/i)).toHaveValue(60)
    expect(screen.getByLabelText(/petunjuk default template/i)).toHaveValue(
      "Kerjakan dengan teliti."
    )
    fireEvent.click(screen.getByRole("combobox", { name: /semester template/i }))
    fireEvent.click(screen.getByRole("option", { name: /^genap$/i }))
    await user.click(screen.getByRole("button", { name: /simpan template/i }))

    await waitFor(() => {
      expect(apiMocks.classesUpdate).toHaveBeenCalledWith(
        "cls-1",
        {
          name: "Kelas 5A",
          schoolName: "SDN Baru",
          academicYear: "2025/2026",
          semester: "genap",
          defaultExamType: "formatif",
          defaultExamDate: "2026-05-14",
          defaultDurationMinutes: 60,
          defaultInstructions: "Kerjakan dengan teliti."
        }
      )
    })
    expect(await screen.findByText(/template kelas disimpan/i)).toBeInTheDocument()
  })

  it("shows siswa coming soon and does not fetch students on select", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(apiMocks.classesList, [baseClass])

    renderRoute()

    await user.click(await screen.findByText("Kelas 5A"))
    expect(await screen.findByRole("heading", { level: 3, name: /segera hadir/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/impor siswa/i)).not.toBeInTheDocument()
    expect(apiMocks.studentsList).not.toHaveBeenCalled()
  })
})
