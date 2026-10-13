import type { ClassEntity } from "@teacher-exam/shared"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { mockApiSpyResolvedValue } from "../../../lib/api-test-utils.js"
import { makeExamWithCompleteMetadata, makeExamWithQuestions } from "./fixtures.js"
import {
  getLoader,
  mockApiResolvedValueOnce,
  mockClassesCreate,
  mockClassesList,
  mockClassesUpdate,
  mockExamsGet,
  mockExamsPatch,
  renderReviewPage,
  setReviewSearch
} from "./setup.js"

function makeClassTemplate(overrides: Partial<ClassEntity> = {}): ClassEntity {
  return {
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
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  }
}

test("choosing a class template applies full sheet defaults and patches exam", async () => {
  mockApiResolvedValueOnce(mockClassesList, [makeClassTemplate()])
  const patchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  fireEvent.click(await screen.findByRole("combobox", { name: /template kelas/i }))
  fireEvent.click(screen.getByText(/kelas 5a/i))

  expect(screen.getByLabelText(/nama sekolah/i)).toHaveValue("SDN Jakarta")
  expect(screen.getByRole("combobox", { name: /^semester$/i })).toHaveTextContent(/ganjil/i)
  expect(screen.getByLabelText(/durasi/i)).toHaveValue("60")
  expect(screen.getByLabelText(/petunjuk pengerjaan/i)).toHaveValue("Kerjakan dengan teliti.")
  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalledWith(
      "E",
      {
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        semester: "ganjil",
        examType: "formatif",
        examDate: "2026-05-14",
        durationMinutes: 60,
        instructions: "Kerjakan dengan teliti."
      }
    )
  })
})

test("incomplete class templates are hidden from the template select", async () => {
  mockApiResolvedValueOnce(mockClassesList, [
    makeClassTemplate({ id: "cls-complete" as ClassEntity["id"], name: "Kelas Lengkap" }),
    makeClassTemplate({
      id: "cls-incomplete" as ClassEntity["id"],
      name: "Kelas Belum Lengkap",
      schoolName: null,
      academicYear: null
    })
  ])

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  fireEvent.click(await screen.findByRole("combobox", { name: /template kelas/i }))
  expect(screen.getByRole("option", { name: /kelas lengkap/i })).toBeInTheDocument()
  expect(screen.queryByRole("option", { name: /kelas belum lengkap/i })).not.toBeInTheDocument()
  expect(screen.getByRole("option", { name: /^tanpa template$/i })).toBeInTheDocument()
})

test("choosing a class template overwrites duration date and instructions from defaults", async () => {
  mockApiResolvedValueOnce(mockClassesList, [makeClassTemplate({
    defaultExamDate: "2026-05-14",
    defaultDurationMinutes: 120,
    defaultInstructions: "Template instructions apply."
  })])
  const patchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithCompleteMetadata("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  fireEvent.change(screen.getByLabelText(/durasi/i), { target: { value: "75" } })
  fireEvent.change(screen.getByLabelText(/petunjuk pengerjaan/i), {
    target: { value: "Manual instruction." }
  })
  fireEvent.click(await screen.findByRole("combobox", { name: /template kelas/i }))
  fireEvent.click(screen.getByText(/kelas 5a/i))

  expect(screen.getByLabelText(/durasi/i)).toHaveValue("120")
  expect(screen.getByLabelText(/petunjuk pengerjaan/i)).toHaveValue("Template instructions apply.")
  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalledWith("E", {
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      semester: "ganjil",
      examType: "formatif",
      examDate: "2026-05-14",
      durationMinutes: 120,
      instructions: "Template instructions apply."
    })
  })
})

test("manual metadata editing still works without choosing a template", async () => {
  const patchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)
  mockApiResolvedValueOnce(mockClassesList, [])

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  const input = screen.getByLabelText(/nama sekolah/i)
  await userEvent.clear(input)
  await userEvent.type(input, "SD Manual")
  fireEvent.blur(input)

  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalledWith("E", { schoolName: "SD Manual" })
  })
})

test("saving current metadata as a new template asks for a name and creates a class", async () => {
  const user = userEvent.setup()
  mockApiResolvedValueOnce(mockClassesList, [])
  mockApiResolvedValueOnce(
    mockClassesCreate,
    makeClassTemplate({
      id: "cls-new" as ClassEntity["id"],
      name: "Kelas 5A SD Negeri 1",
      schoolName: "SD Negeri 1"
    })
  )

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithCompleteMetadata("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  await user.click(screen.getByRole("button", { name: /simpan sebagai template/i }))
  const nameInput = await screen.findByLabelText(/nama template/i)
  await user.clear(nameInput)
  await user.type(nameInput, "Kelas 5A SD Negeri 1")
  await user.click(screen.getByRole("button", { name: /^simpan$/i }))

  await waitFor(() => {
    expect(mockClassesCreate).toHaveBeenCalledWith({
      name: "Kelas 5A SD Negeri 1",
      schoolName: "SD Negeri 1",
      academicYear: "2025/2026",
      defaultExamType: "formatif",
      defaultExamDate: "2025-06-01",
      defaultDurationMinutes: 60
    })
  })
})

test("saving current metadata updates the selected class template", async () => {
  const user = userEvent.setup()
  mockApiResolvedValueOnce(mockClassesList, [makeClassTemplate({ id: "cls-1" as ClassEntity["id"] })])
  mockApiResolvedValueOnce(
    mockClassesUpdate,
    makeClassTemplate({
      id: "cls-1" as ClassEntity["id"],
      schoolName: "SD Negeri 1"
    })
  )
  const patchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithCompleteMetadata("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  fireEvent.click(await screen.findByRole("combobox", { name: /template kelas/i }))
  fireEvent.click(screen.getByText(/kelas 5a/i))
  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalled()
  })
  await user.click(screen.getByRole("button", { name: /simpan sebagai template/i }))

  await waitFor(() => {
    expect(mockClassesUpdate).toHaveBeenCalledWith(
      "cls-1",
      {
        name: "Kelas 5A",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        semester: "ganjil",
        defaultExamType: "formatif",
        defaultExamDate: "2026-05-14",
        defaultDurationMinutes: 60,
        defaultInstructions: "Kerjakan dengan teliti."
      }
    )
  })
})
