import type * as TanStackRouter from "@tanstack/react-router"
import type { ClassEntity, StudentEntity } from "@teacher-exam/shared"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.kelas.js"

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

const listClassesMock = vi.fn()
const createClassMock = vi.fn()
const updateClassMock = vi.fn()
const removeClassMock = vi.fn()
const listStudentsMock = vi.fn()
const bulkCreateStudentsMock = vi.fn()
const removeStudentMock = vi.fn()

vi.mock("../../lib/api.js", () => ({
  api: {
    classes: {
      list: (...args: Array<unknown>) => listClassesMock(...args),
      create: (...args: Array<unknown>) => createClassMock(...args),
      update: (...args: Array<unknown>) => updateClassMock(...args),
      remove: (...args: Array<unknown>) => removeClassMock(...args),
      students: {
        list: (...args: Array<unknown>) => listStudentsMock(...args),
        bulkCreate: (...args: Array<unknown>) => bulkCreateStudentsMock(...args),
        remove: (...args: Array<unknown>) => removeStudentMock(...args)
      }
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

const NOW = "2024-01-01T00:00:00.000Z"

function makeClass(overrides: Partial<ClassEntity> = {}): ClassEntity {
  return {
    id: "cls-1" as ClassEntity["id"],
    userId: "user-1" as ClassEntity["userId"],
    name: "Kelas 5A",
    grade: 5,
    subject: "ipas",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  }
}

function makeStudent(overrides: Partial<StudentEntity> = {}): StudentEntity {
  return {
    id: "std-1" as StudentEntity["id"],
    classId: "cls-1" as StudentEntity["classId"],
    name: "Budi",
    identifier: null,
    createdAt: NOW,
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  listClassesMock.mockReset()
  listStudentsMock.mockReset()
})

function renderRoute() {
  const Component = (Route as unknown as { options: { component: React.ComponentType } }).options.component
  return render(
    <ToastProvider>
      <Component />
    </ToastProvider>
  )
}

describe("Kelas route", () => {
  it("lists the teacher's classes", async () => {
    listClassesMock.mockResolvedValue(Either.right([makeClass({ name: "Kelas 5A" })]))
    renderRoute()
    expect(await screen.findByText("Kelas 5A")).toBeInTheDocument()
  })

  it("shows empty state when no classes exist", async () => {
    listClassesMock.mockResolvedValue(Either.right([]))
    renderRoute()
    expect(await screen.findByText(/belum ada kelas/i)).toBeInTheDocument()
  })

  it("creates a class", async () => {
    const user = userEvent.setup()
    listClassesMock.mockResolvedValue(Either.right([]))
    createClassMock.mockResolvedValue(
      Either.right(makeClass({ id: "cls-new" as ClassEntity["id"], name: "Kelas 6B" }))
    )

    renderRoute()
    await screen.findByText(/belum ada kelas/i)

    const nameInput = screen.getByLabelText(/nama kelas/i)
    await user.type(nameInput, "Kelas 6B")
    await user.click(screen.getByRole("button", { name: /tambah kelas/i }))

    await waitFor(() => expect(createClassMock).toHaveBeenCalled())
  })

  it("imports students via paste and calls bulkCreate", async () => {
    const user = userEvent.setup()
    const cls = makeClass()
    listClassesMock.mockResolvedValue(Either.right([cls]))
    listStudentsMock.mockResolvedValue(Either.right([]))
    bulkCreateStudentsMock.mockResolvedValue(
      Either.right([
        makeStudent({ name: "Budi" }),
        makeStudent({ id: "std-2" as StudentEntity["id"], name: "Siti", identifier: null })
      ])
    )

    renderRoute()
    const classCard = await screen.findByText("Kelas 5A")
    await user.click(classCard)

    const pasteInput = await screen.findByLabelText(/impor siswa/i)
    await user.type(pasteInput, "Budi,001\nSiti")
    await user.click(screen.getByRole("button", { name: /impor/i }))

    await waitFor(() => expect(bulkCreateStudentsMock).toHaveBeenCalledWith("cls-1", expect.anything()))
  })

  it("lists students in a class", async () => {
    const user = userEvent.setup()
    const cls = makeClass()
    listClassesMock.mockResolvedValue(Either.right([cls]))
    listStudentsMock.mockResolvedValue(Either.right([makeStudent({ name: "Budi" })]))

    renderRoute()
    await user.click(await screen.findByText("Kelas 5A"))
    expect(await screen.findByText("Budi")).toBeInTheDocument()
  })

  it("deletes a student on confirm", async () => {
    const user = userEvent.setup()
    const cls = makeClass()
    listClassesMock.mockResolvedValue(Either.right([cls]))
    listStudentsMock.mockResolvedValue(Either.right([makeStudent({ name: "Budi" })]))
    removeStudentMock.mockResolvedValue(Either.right(undefined))

    renderRoute()
    await user.click(await screen.findByText("Kelas 5A"))
    const deleteButton = await screen.findByRole("button", { name: /hapus siswa/i })
    await user.click(deleteButton)
    await user.click(screen.getByRole("button", { name: /ya, hapus/i }))

    await waitFor(() => expect(removeStudentMock).toHaveBeenCalled())
  })
})
