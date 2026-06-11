import type * as UiModule from "@teacher-exam/ui"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiOk } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"
import { makeExam } from "../../test/fixtures/exam.js"
import { useDuplicateExam } from "../use-duplicate-exam.js"

const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()
const mockToast = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate })
}))

vi.mock("@teacher-exam/ui", async (importOriginal) => {
  const orig = await importOriginal<typeof UiModule>()
  return { ...orig, useToast: () => ({ toast: mockToast }) }
})

const mockDuplicate = vi.fn()

vi.mock("../../lib/api", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: {
        ...orig.api.exams,
        duplicate: (id: string) => mockDuplicate(id)
      }
    }
  }
})

describe("useDuplicateExam", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts with no confirming exam and dialog closed", () => {
    const { result } = renderHook(() => useDuplicateExam())
    expect(result.current.confirmingExam).toBeNull()
    expect(result.current.isPending).toBe(false)
  })

  it("openFor sets the confirming exam", () => {
    const { result } = renderHook(() => useDuplicateExam())
    const exam = makeExam({ topics: ["Ide Pokok"] })
    act(() => {
      result.current.openFor(exam)
    })
    expect(result.current.confirmingExam).toEqual(exam)
  })

  it("close clears the confirming exam", () => {
    const { result } = renderHook(() => useDuplicateExam())
    act(() => {
      result.current.openFor(makeExam({ topics: ["Ide Pokok"] }))
    })
    act(() => {
      result.current.close()
    })
    expect(result.current.confirmingExam).toBeNull()
  })

  it("confirm calls api.exams.duplicate and navigates to /review on success", async () => {
    const newExam = makeExam({ id: "new-exam-1", reviewMode: "fast" })
    mockDuplicate.mockImplementation(() => apiOk(newExam))

    const { result } = renderHook(() => useDuplicateExam())
    act(() => {
      result.current.openFor(makeExam({ id: "exam-1" }))
    })

    await act(async () => {
      await result.current.confirm()
    })

    expect(mockDuplicate).toHaveBeenCalledWith("exam-1")
    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/review",
      search: { examId: "new-exam-1", mode: "fast" }
    })
    expect(result.current.confirmingExam).toBeNull()
  })

  it("confirm shows error toast and does NOT navigate on failure", async () => {
    mockDuplicate.mockRejectedValue(new Error("Network failure"))

    const { result } = renderHook(() => useDuplicateExam())
    act(() => {
      result.current.openFor(makeExam({ topics: ["Ide Pokok"] }))
    })

    await act(async () => {
      await result.current.confirm()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" })
    )
    expect(result.current.confirmingExam).not.toBeNull()
  })
})
