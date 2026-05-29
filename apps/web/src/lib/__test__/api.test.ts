import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest"
import { makeExamWithQuestions, makeMcqSingle } from "../../test/fixtures/exam.js"
import { api, ApiError, apiFetch, RateLimitedError, unwrapApiEither } from "../api.js"

// Make apiFetch testable by exporting it — see implementation

const mockFetch = vi.fn()

function toJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const VALID_EXAM_WITH_QUESTIONS = toJson(makeExamWithQuestions("exam_1"))

beforeEach(() => {
  globalThis.fetch = mockFetch
  mockFetch.mockReset()
})

describe("apiFetch", () => {
  it("returns parsed JSON on a successful response", async () => {
    const data = { id: "exam_1", title: "Math Test" }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(data)
    })

    const result = await apiFetch<typeof data>("/exams")
    expect(result).toEqual(data)
  })

  it("throws ApiError with correct code, status and message on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Exam not found", code: "EXAM_NOT_FOUND" })
    })

    await expect(apiFetch("/exams/missing")).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return (
        err.status === 404 &&
        err.code === "EXAM_NOT_FOUND" &&
        err.message === "Exam not found"
      )
    })
  })

  it("prefers detailed message when error response includes one", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () =>
        Promise.resolve({
          error: "AI generation failed",
          message: "Expected 40 questions, got 20",
          code: "AI_GENERATION_ERROR"
        })
    })

    await expect(apiFetch("/ai/generate")).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return (
        err.status === 502 &&
        err.code === "AI_GENERATION_ERROR" &&
        err.message === "Expected 40 questions, got 20"
      )
    })
  })

  it("defaults to UNKNOWN code when error body has no code field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Something blew up" })
    })

    await expect(apiFetch("/exams")).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return err.code === "UNKNOWN" && err.status === 500
    })
  })

  it("falls back to statusText when JSON parsing fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.reject(new SyntaxError("not json"))
    })

    await expect(apiFetch("/exams")).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return err.message === "Bad Gateway" && err.code === "UNKNOWN" && err.status === 502
    })
  })
})

describe("ApiError", () => {
  it("has correct name and properties", () => {
    const err = new ApiError({ message: "Oops", code: "ERR_TEST", status: 400 })
    expect(err.name).toBe("ApiError")
    expect(err.code).toBe("ERR_TEST")
    expect(err.status).toBe(400)
    expect(err.message).toBe("Oops")
    expect(err instanceof Error).toBe(true)
    expect(err instanceof ApiError).toBe(true)
  })

  it("stores optional details", () => {
    const details = { field: "title", issue: "required" }
    const err = new ApiError({ message: "Validation failed", code: "VALIDATION", status: 422, details })
    expect(err.details).toEqual(details)
  })
})

const VALID_PUBLIC_EXAM_WITH_QUESTIONS = {
  id: "exam_public_1",
  title: "Bahasa Indonesia · Kelas 6 · Teks Narasi",
  subject: "bahasa_indonesia",
  grade: 6,
  difficulty: "sedang",
  topics: ["Teks Narasi"],
  reviewMode: "fast",
  status: "final",
  schoolName: null,
  academicYear: null,
  examType: "formatif",
  examDate: null,
  durationMinutes: null,
  instructions: null,
  classContext: null,
  discussionMd: null,
  publishedAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  questions: []
}

describe("api.ai.generate", () => {
  it("POSTs to /api/ai/generate and returns decoded ExamWithQuestions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(VALID_EXAM_WITH_QUESTIONS)
    })

    const input = {
      subject: "bahasa_indonesia" as const,
      grade: 6,
      difficulty: "sedang" as const,
      topics: ["Teks Narasi"],
      reviewMode: "fast" as const
    }

    const result = unwrapApiEither(await api.ai.generate(input))
    expect(result.id).toBe("exam_1")
    expect(result.title).toBe("Bahasa Indonesia · Kelas 6 · Teks Narasi")
    expect(result.questions).toHaveLength(20)

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/ai/generate",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("serializes matematika subject in generate request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...VALID_EXAM_WITH_QUESTIONS, subject: "matematika" })
    })

    unwrapApiEither(
      await api.ai.generate({
        subject: "matematika",
        grade: 5,
        difficulty: "sedang",
        topics: ["Pecahan, Desimal, dan Persen"],
        reviewMode: "fast"
      })
    )

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined
    expect(init?.body).toBe(JSON.stringify({
      subject: "matematika",
      grade: 5,
      difficulty: "sedang",
      topics: ["Pecahan, Desimal, dan Persen"],
      reviewMode: "fast"
    }))
  })

  it("throws ApiError when server response fails schema decode", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: "shape" })
    })

    await expect(async () =>
      unwrapApiEither(
        await api.ai.generate({
          subject: "bahasa_indonesia" as const,
          grade: 6,
          difficulty: "sedang" as const,
          topics: ["Teks Narasi"],
          reviewMode: "fast" as const
        })
      )
    ).rejects.toThrow()
  })

  it("rethrows RateLimitedError unchanged", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === "Retry-After" ? "30" : null) }
    })

    await expect(async () =>
      unwrapApiEither(
        await api.ai.generate({
          subject: "bahasa_indonesia" as const,
          grade: 6,
          difficulty: "sedang" as const,
          topics: ["Teks Narasi"],
          reviewMode: "fast" as const
        })
      )
    ).rejects.toSatisfy((err: unknown) => err instanceof RateLimitedError && err.retryAfterSec === 30)
  })
})

function makeResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeQuestionResponse(
  overrides: Partial<ReturnType<typeof makeMcqSingle>> & { id?: string; examId?: string } = {}
) {
  return toJson({
    ...makeMcqSingle(1, "a", { examId: "E", status: "accepted", now: "2026-04-23T00:00:00.000Z" }),
    id: "Q",
    examId: "E",
    ...overrides
  })
}

describe("api.exams.finalize", () => {
  test("POSTs to /api/exams/:id/finalize with credentials", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(toJson({ ...makeExamWithQuestions("E"), status: "final" }))
    )
    const result = unwrapApiEither(await api.exams.finalize("E"))
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exams/E/finalize",
      expect.objectContaining({ method: "POST", credentials: "include" })
    )
    expect(result.status).toBe("final")
  })

  test("throws ApiError on non-2xx response", async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: "Not all accepted", code: "FINALIZE_NOT_ALLOWED" }, 422))
    await expect(async () => unwrapApiEither(await api.exams.finalize("E"))).rejects.toMatchObject({
      code: "FINALIZE_NOT_ALLOWED",
      status: 422
    })
  })
})

describe("api.exams.validateCurriculum", () => {
  test("POSTs to /api/exams/:id/validate-curriculum", async () => {
    mockFetch.mockResolvedValue(makeResponse(VALID_EXAM_WITH_QUESTIONS))
    const result = unwrapApiEither(await api.exams.validateCurriculum("exam_1"))
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exams/exam_1/validate-curriculum",
      expect.objectContaining({ method: "POST", credentials: "include" })
    )
    expect(result.id).toBe("exam_1")
  })
})

describe("api.questions.patch", () => {
  test("PATCHes /api/questions/:id with body and credentials", async () => {
    mockFetch.mockResolvedValue(makeResponse(makeQuestionResponse()))
    const result = unwrapApiEither(await api.questions.patch("Q", { status: "accepted" }))
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/questions/Q",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
        credentials: "include"
      })
    )
    expect(result.status).toBe("accepted")
  })

  test("throws ApiError on 404", async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: "Not found", code: "NOT_FOUND" }, 404))
    await expect(async () => unwrapApiEither(await api.questions.patch("Q", { status: "accepted" }))).rejects
      .toMatchObject({ status: 404 })
  })
})

describe("api.questions.regenerate", () => {
  test("POSTs to /api/questions/:id/regenerate with optional hint body", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(makeQuestionResponse({ status: "pending", text: "New AI question", correct: "b" }))
    )
    const result = unwrapApiEither(await api.questions.regenerate("Q", { hint: "fokus sila ke-3" }))
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/questions/Q/regenerate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hint: "fokus sila ke-3" }),
        credentials: "include"
      })
    )
    expect(result.status).toBe("pending")
    expect(result.text).toBe("New AI question")
  })

  test("POSTs with empty body when no hint provided", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(makeQuestionResponse({ status: "pending", text: "New AI question", correct: "b" }))
    )
    unwrapApiEither(await api.questions.regenerate("Q"))
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/questions/Q/regenerate",
      expect.objectContaining({ method: "POST", body: JSON.stringify({}) })
    )
  })
})

describe("api.exams.generateDiscussion", () => {
  it("POSTs to /api/exams/:id/discussion and returns ExamWithQuestions", async () => {
    const examWithDiscussion = {
      ...VALID_EXAM_WITH_QUESTIONS,
      status: "final",
      discussionMd: "## 1. Soal\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci."
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(examWithDiscussion)
    })

    const result = unwrapApiEither(await api.exams.generateDiscussion("exam_1"))
    expect(result.id).toBe("exam_1")
    expect(result.discussionMd).toContain("Jawaban Benar")

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exams/exam_1/discussion",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("propagates ApiError on 409 (discussion already exists)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: () => Promise.resolve({ error: "Discussion already exists", code: "DISCUSSION_ALREADY_EXISTS" })
    })

    await expect(async () => unwrapApiEither(await api.exams.generateDiscussion("exam_1"))).rejects.toSatisfy(
      (err: unknown) => {
        if (!(err instanceof ApiError)) return false
        return err.status === 409 && err.code === "DISCUSSION_ALREADY_EXISTS"
      }
    )
  })
})

describe("api.exams.share", () => {
  it("POSTs to /api/exams/:id/share and returns share metadata", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          slug: "share-abc123",
          publicUrlPath: "/share/share-abc123",
          publishedAt: "2024-01-01T00:00:00.000Z"
        })
    })

    const result = unwrapApiEither(await api.exams.share("exam_1"))

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exams/exam_1/share",
      expect.objectContaining({ method: "POST", credentials: "include" })
    )
    expect(result.publicUrlPath).toBe("/share/share-abc123")
  })
})

describe("api.publicExams.get", () => {
  it("GETs /api/public/exams/:slug and decodes the public exam payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(VALID_PUBLIC_EXAM_WITH_QUESTIONS)
    })

    const result = unwrapApiEither(await api.publicExams.get("share-abc123"))

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/public/exams/share-abc123",
      expect.objectContaining({ credentials: "include" })
    )
    expect(result.publishedAt).toBe("2024-01-01T00:00:00.000Z")
    expect(result.questions).toEqual([])
  })
})
